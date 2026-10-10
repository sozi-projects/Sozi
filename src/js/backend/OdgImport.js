/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Import LibreOffice Draw documents (.odg) as SVG with layers.
 *
 * LibreOffice Draw does not write its layers into SVG exports.
 * This module exports the drawing with LibreOffice, reads the layer of each
 * shape from the .odg file, and moves the shapes of the SVG export into one
 * group per layer, directly under the SVG root element, so that Sozi
 * recognizes them as layers. It follows the rules of the draw2sozi script
 * (https://github.com/tebbiworld/draw2sozi):
 *
 * - Layers are stacked in the order of the layer list of the drawing.
 * - Groups containing shapes from several layers go to a layer "Groups".
 * - Shapes and groups named in Draw get their name as id, so that frames
 *   anchored to them survive edits in Draw.
 * - The file name is used as title if the export has none.
 *
 * @module
 */

import fs from "fs";
import path from "path";
import process from "process";
import {execFile} from "child_process";
import * as tmp from "tmp";
import JSZip from "jszip";
import Jed from "jed";

const NS_SVG      = "http://www.w3.org/2000/svg";
const NS_DRAW     = "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0";
const NS_INKSCAPE = "http://www.inkscape.org/namespaces/inkscape";
const NS_OOO      = "http://xml.openoffice.org/svg/export";

/** The maximum size of an XML part of the drawing and of the SVG export, in bytes.
 *
 * @type {number}
 */
const MAX_XML_BYTES = 64 * 1024 * 1024;

/** The maximum duration of the LibreOffice export, in milliseconds.
 *
 * @type {number}
 */
const EXPORT_TIMEOUT_MS = 300000;

/** The key of the layer for groups that contain shapes from several layers.
 *
 * It cannot collide with a layer name of the drawing.
 *
 * @type {string}
 */
const GROUPS_LAYER = "\u0000groups";

/** The translation function, set by {@linkcode module:backend/OdgImport.convertOdg|convertOdg}.
 *
 * @param {string} s - A message.
 * @returns {string} - The translated message.
 */
let _ = s => s;

/** Internal layers of LibreOffice that are not reported as empty.
 *
 * @type {string[]}
 */
const INTERNAL_LAYERS = ["background", "backgroundobjects", "controls", "measurelines"];

/** An error that is reported to the user as is.
 *
 * @extends Error
 */
export class OdgImportError extends Error {}

/** Check whether a file name designates a LibreOffice Draw document.
 *
 * @param {string} fileName - A file name.
 * @returns {boolean} - `true` if the file name ends with `.odg`.
 */
export function isOdgFile(fileName) {
    return /\.odg$/i.test(fileName);
}

/** Find the LibreOffice executable.
 *
 * The environment variable `SOZI_SOFFICE` can contain the path to the executable.
 *
 * @returns {string} - The path of the LibreOffice executable.
 */
export function findSoffice() {
    if (process.env.SOZI_SOFFICE) {
        return process.env.SOZI_SOFFICE;
    }
    const names = process.platform === "win32" ? ["soffice.exe"] : ["soffice", "libreoffice"];
    const dirs  = (process.env.PATH || "").split(path.delimiter).filter(d => d);
    for (const dir of dirs) {
        for (const name of names) {
            const candidate = path.join(dir, name);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }
    const candidates = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice"
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new OdgImportError(_("LibreOffice was not found. Install LibreOffice or set the environment variable SOZI_SOFFICE."));
}

/** Export a drawing as SVG with LibreOffice.
 *
 * LibreOffice runs without user interface, with a temporary user profile,
 * so that it works while the drawing is open in LibreOffice.
 *
 * @param {string} odgFileName - The absolute path of the drawing.
 * @returns {Promise<string>} - A promise that resolves to the SVG source.
 */
function exportSVG(odgFileName) {
    const soffice = findSoffice();
    const outDir  = tmp.dirSync({prefix: "sozi-odg-", unsafeCleanup: true});
    const profile = tmp.dirSync({prefix: "sozi-odg-profile-", unsafeCleanup: true});
    const profileUrl = "file:///" + profile.name.replace(/\\/g, "/").replace(/^\/+/, "");

    // No shell: the arguments are passed as an array.
    const args = [
        `-env:UserInstallation=${profileUrl}`, "--headless",
        "--convert-to", "svg:draw_svg_Export", "--outdir", outDir.name, odgFileName
    ];

    return new Promise((resolve, reject) => {
        execFile(soffice, args, {timeout: EXPORT_TIMEOUT_MS, windowsHide: true}, err => {
            try {
                if (err) {
                    throw new OdgImportError(err.killed ?
                        _("The LibreOffice export did not finish in time.") :
                        Jed.sprintf(_("The LibreOffice export failed: %s"), err.message));
                }
                const svgFileName = path.join(outDir.name, path.basename(odgFileName).replace(/\.odg$/i, ".svg"));
                if (!fs.existsSync(svgFileName)) {
                    throw new OdgImportError(_("LibreOffice did not create an SVG file."));
                }
                if (fs.statSync(svgFileName).size > MAX_XML_BYTES) {
                    throw new OdgImportError(_("The SVG export is too large."));
                }
                resolve(fs.readFileSync(svgFileName, {encoding: "utf8"}));
            }
            catch (e) {
                reject(e);
            }
            finally {
                outDir.removeCallback();
                profile.removeCallback();
            }
        });
    });
}

/** Parse an XML document and fail on syntax errors.
 *
 * @param {string} source - The XML source.
 * @param {string} what - A description of the document, for error messages.
 * @returns {Document} - The parsed document.
 */
function parseXML(source, what) {
    const doc = new DOMParser().parseFromString(source, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
        throw new OdgImportError(Jed.sprintf(_("%s is not valid XML."), what));
    }
    return doc;
}

/** Read an XML part of a drawing.
 *
 * @param {JSZip} zip - The drawing, as a ZIP archive.
 * @param {string} name - The name of the part.
 * @returns {Promise<Document>} - A promise that resolves to the parsed part.
 */
async function readPart(zip, name) {
    const file = zip.file(name);
    if (!file) {
        throw new OdgImportError(Jed.sprintf(_("%s is missing. Is this a LibreOffice Draw document?"), name));
    }
    // Check the size announced in the archive before decompressing.
    if (file._data && file._data.uncompressedSize > MAX_XML_BYTES) {
        throw new OdgImportError(Jed.sprintf(_("%s is too large."), name));
    }
    const source = await file.async("string");
    if (source.length > MAX_XML_BYTES) {
        throw new OdgImportError(Jed.sprintf(_("%s is too large."), name));
    }
    return parseXML(source, name);
}

/** Get the child elements of an element in a given namespace.
 *
 * @param {Element} el - An element.
 * @param {string} ns - A namespace URI.
 * @returns {Element[]} - The child elements in this namespace.
 */
function childrenNS(el, ns) {
    return Array.from(el.children).filter(c => c.namespaceURI === ns);
}

/** Get the layers of a shape, or of all shapes in a group.
 *
 * @param {Element} el - A shape or group of the drawing.
 * @returns {Set<string>} - The layer names.
 */
function layersOf(el) {
    if (el.localName === "g") {
        const result = new Set();
        for (const c of childrenNS(el, NS_DRAW)) {
            layersOf(c).forEach(l => result.add(l));
        }
        return result;
    }
    return new Set([el.getAttributeNS(NS_DRAW, "layer") || "layout"]);
}

/** Read the layers and the top-level shapes of a drawing.
 *
 * @param {Buffer} odgData - The content of the .odg file.
 * @returns {Promise<{layerOrder: string[], items: Element[]}>} - The layer names in stacking order and the top-level shapes.
 */
async function readOdg(odgData) {
    const zip     = await JSZip.loadAsync(odgData);
    const styles  = await readPart(zip, "styles.xml");
    const content = await readPart(zip, "content.xml");

    const layerOrder = [];
    for (const doc of [styles, content]) {
        for (const set of Array.from(doc.getElementsByTagNameNS(NS_DRAW, "layer-set"))) {
            for (const layer of childrenNS(set, NS_DRAW)) {
                const name = layer.getAttributeNS(NS_DRAW, "name");
                if (name && layerOrder.indexOf(name) < 0) {
                    layerOrder.push(name);
                }
            }
        }
    }
    if (!layerOrder.length) {
        layerOrder.push("layout");
    }

    const pages = content.getElementsByTagNameNS(NS_DRAW, "page");
    if (pages.length !== 1) {
        throw new OdgImportError(Jed.sprintf(_("The drawing has %d pages. Only drawings with one page are supported."), pages.length));
    }

    const items = childrenNS(pages[0], NS_DRAW).filter(el => el.localName !== "layer-set");
    return {layerOrder, items};
}

/** Get the child `g` elements of an SVG element.
 *
 * @param {Element} el - An SVG element.
 * @returns {Element[]} - The child groups.
 */
function svgGroups(el) {
    return Array.from(el.children).filter(c => c.namespaceURI === NS_SVG && c.localName === "g");
}

/** Find the first SVG group with a given class.
 *
 * @param {Document} doc - An SVG document.
 * @param {string} cls - A class name.
 * @returns {Element[]} - All groups with this class.
 */
function groupsWithClass(doc, cls) {
    return Array.from(doc.getElementsByTagNameNS(NS_SVG, "g")).filter(g => g.getAttribute("class") === cls);
}

/** Make a valid XML id from a layer name.
 *
 * @param {string} name - A layer name.
 * @param {Set<string>} used - The ids already in use; the result is added.
 * @returns {string} - A unique id.
 */
function xmlId(name, used) {
    let base = name.replace(/[^A-Za-z0-9_.-]/g, "_");
    if (!/^[A-Za-z_]/.test(base)) {
        base = "layer_" + base;
    }
    let candidate = base;
    for (let i = 2; used.has(candidate); i ++) {
        candidate = `${base}_${i}`;
    }
    used.add(candidate);
    return candidate;
}

/** Check whether a character is a letter.
 *
 * Letters of scripts without case are not recognized.
 *
 * @param {string} c - A character.
 * @returns {boolean} - `true` if the character is a letter.
 */
function isLetter(c) {
    return c.toLowerCase() !== c.toUpperCase();
}

/** Check whether a shape name can be used as an XML id.
 *
 * @param {string} name - A shape name.
 * @returns {boolean} - `true` if the name is a valid id.
 */
function isValidId(name) {
    const chars = Array.from(name);
    if (!chars.length || !(isLetter(chars[0]) || chars[0] === "_")) {
        return false;
    }
    return chars.every(c => isLetter(c) || /[0-9_.-]/.test(c));
}

/** Get the element that carries the id of a shape in the SVG export.
 *
 * @param {Element} g - The group of a shape or group in the SVG export.
 * @returns {Element} - The element to identify.
 */
function shapeTarget(g) {
    if (g.getAttribute("class") === "Group") {
        return g;
    }
    const inner = svgGroups(g).find(c => c.hasAttribute("id"));
    return inner || g;
}

/** Collect the names of shapes and groups and the corresponding SVG elements.
 *
 * @param {Element} odgEl - A shape or group of the drawing.
 * @param {Element} svgEl - The corresponding group of the SVG export.
 * @param {Array} out - The list of `[name, element]` pairs to complete.
 * @param {string[]} messages - The list of messages to complete.
 */
function collectNames(odgEl, svgEl, out, messages) {
    const name = odgEl.getAttributeNS(NS_DRAW, "name");
    if (name) {
        out.push([name, shapeTarget(svgEl)]);
    }
    if (odgEl.localName === "g") {
        const odgKids = childrenNS(odgEl, NS_DRAW);
        const svgKids = svgGroups(svgEl);
        if (odgKids.length !== svgKids.length) {
            messages.push(Jed.sprintf(_("Group \"%s\" has a different number of shapes in the drawing and in the SVG export: the names of its shapes are not used."), name || _("without name")));
            return;
        }
        odgKids.forEach((o, i) => collectNames(o, svgKids[i], out, messages));
    }
}

/** Use the names of shapes and groups as ids, and update the references to the former ids.
 *
 * @param {Element} root - The root element of the SVG export.
 * @param {Array} pairs - The `[name, element]` pairs.
 * @param {Set<string>} reserved - The ids that must not be used.
 * @param {string[]} messages - The list of messages to complete.
 */
function applyNames(root, pairs, reserved, messages) {
    const count = {};
    for (const [name] of pairs) {
        count[name] = (count[name] || 0) + 1;
    }
    const renamed  = {};
    const reported = new Set();
    for (const [name, el] of pairs) {
        if (!isValidId(name)) {
            messages.push(Jed.sprintf(_("Name \"%s\" is not a valid id and was not used."), name));
            continue;
        }
        if (count[name] > 1) {
            if (!reported.has(name)) {
                messages.push(Jed.sprintf(_("Name \"%s\" is used %d times and was not used."), name, count[name]));
                reported.add(name);
            }
            continue;
        }
        const old = el.getAttribute("id");
        if (name === old) {
            continue;
        }
        if (reserved.has(name)) {
            messages.push(Jed.sprintf(_("Name \"%s\" is already used as id and was not used."), name));
            continue;
        }
        el.setAttribute("id", name);
        if (old) {
            renamed[old] = name;
        }
    }

    // Update the references: ooo:id-list, xlink:href="#...", url(#...).
    if (Object.keys(renamed).length) {
        for (const e of Array.from(root.getElementsByTagName("*"))) {
            for (const attr of Array.from(e.attributes)) {
                if (attr.name === "id") {
                    continue;
                }
                let value;
                if (attr.namespaceURI === NS_OOO && attr.localName === "id-list") {
                    value = attr.value.split(/\s+/).map(t => renamed[t] || t).join(" ");
                }
                else {
                    value = attr.value.replace(/#([A-Za-z0-9_.-]+)/g, (m, id) => id in renamed ? "#" + renamed[id] : m);
                }
                if (value !== attr.value) {
                    e.setAttributeNS(attr.namespaceURI, attr.name, value);
                }
            }
        }
    }
}

/** Build an SVG document with one layer per layer of the drawing.
 *
 * @param {Buffer} odgData - The content of the .odg file.
 * @param {string} svgSource - The SVG export of the drawing.
 * @param {string} title - The title to use if the SVG export has none.
 * @returns {Promise<{svg: string, messages: string[]}>} - The SVG source and messages for the user.
 */
export async function buildLayeredSVG(odgData, svgSource, title) {
    const {layerOrder, items} = await readOdg(odgData);
    const doc  = parseXML(svgSource, "The SVG export");
    const root = doc.documentElement;
    if (root.namespaceURI !== NS_SVG || root.localName !== "svg") {
        throw new OdgImportError(_("The export is not an SVG document."));
    }

    const pages = groupsWithClass(doc, "Page");
    if (pages.length !== 1) {
        throw new OdgImportError(Jed.sprintf(_("The SVG export contains %d pages instead of one."), pages.length));
    }
    const slide  = groupsWithClass(doc, "Slide")[0];
    const master = groupsWithClass(doc, "Master_Slide")[0];
    const shapes = svgGroups(pages[0]);

    if (items.length !== shapes.length) {
        throw new OdgImportError(Jed.sprintf(_("The drawing contains %d objects, the SVG export %d."), items.length, shapes.length));
    }

    const messages = [];

    // Assign each top-level shape to a layer.
    const targets = items.map(it => {
        const layers = layersOf(it);
        return layers.size === 1 ? layers.values().next().value : GROUPS_LAYER;
    });

    const order = layerOrder.slice();
    for (const t of targets) {
        if (order.indexOf(t) < 0 && t !== GROUPS_LAYER) {
            order.push(t);
        }
    }
    if (targets.indexOf(GROUPS_LAYER) >= 0) {
        order.push(GROUPS_LAYER);
    }
    const usedLayers = order.filter(l => targets.indexOf(l) >= 0);

    // Fix the ids of the layers, then use the names of shapes as ids.
    const usedIds = new Set(Array.from(root.getElementsByTagName("*")).map(e => e.getAttribute("id")).filter(id => id));
    const hasMaster = master && Array.from(master.children).some(c => c.getAttribute("class") === "BackgroundObjects" && c.children.length);
    const masterId  = hasMaster ? xmlId("master-page", usedIds) : null;
    const layerIds  = {};
    for (const l of usedLayers) {
        layerIds[l] = xmlId(l === GROUPS_LAYER ? "groups" : l, usedIds);
    }
    const names = [];
    items.forEach((it, i) => collectNames(it, shapes[i], names, messages));
    applyNames(root, names, usedIds, messages);

    // Build the new document.
    const out = document.implementation.createDocument(NS_SVG, "svg", null);
    const svg = out.documentElement;
    for (const attr of Array.from(root.attributes)) {
        svg.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
    }
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:inkscape", NS_INKSCAPE);
    for (const child of Array.from(root.children)) {
        if (child.namespaceURI === NS_SVG && (child.localName === "defs" || child.localName === "title")) {
            svg.appendChild(out.importNode(child, true));
        }
    }

    let titleEl = Array.from(svg.children).find(c => c.localName === "title");
    if (!titleEl) {
        titleEl = out.createElementNS(NS_SVG, "title");
        svg.insertBefore(titleEl, svg.firstChild);
    }
    if (!titleEl.textContent.trim()) {
        titleEl.textContent = title;
    }

    const clip = slide ? slide.getAttribute("clip-path") : null;

    /** Create a layer group in the new document.
     *
     * @param {string} id - The id of the layer.
     * @param {string} label - The label of the layer.
     * @returns {Element} - The new group.
     */
    function addLayer(id, label) {
        const g = out.createElementNS(NS_SVG, "g");
        g.setAttribute("id", id);
        g.setAttributeNS(NS_INKSCAPE, "inkscape:groupmode", "layer");
        g.setAttributeNS(NS_INKSCAPE, "inkscape:label", label);
        svg.appendChild(g);
        return g;
    }

    if (hasMaster) {
        addLayer(masterId, _("Master page")).appendChild(out.importNode(master, true));
    }
    for (const l of usedLayers) {
        const g = addLayer(layerIds[l], l === GROUPS_LAYER ? _("Groups") : l);
        if (clip) {
            g.setAttribute("clip-path", clip);
        }
        shapes.forEach((s, i) => {
            if (targets[i] === l) {
                g.appendChild(out.importNode(s, true));
            }
        });
    }

    const empty = layerOrder.filter(l => usedLayers.indexOf(l) < 0 && INTERNAL_LAYERS.indexOf(l) < 0);
    if (empty.length) {
        messages.push(Jed.sprintf(_("Empty layers (omitted): %s"), empty.join(", ")));
    }

    return {svg: new XMLSerializer().serializeToString(out), messages};
}

/** Convert a LibreOffice Draw document into an SVG document with layers.
 *
 * @param {string} odgFileName - The absolute path of the drawing.
 * @param {function(string):string} gettext - The translation function for messages.
 * @returns {Promise<{svg: string, messages: string[]}>} - The SVG source and messages for the user.
 */
export async function convertOdg(odgFileName, gettext) {
    if (gettext) {
        _ = gettext;
    }
    const stat = fs.statSync(odgFileName);
    if (stat.size > MAX_XML_BYTES) {
        throw new OdgImportError(_("The drawing is too large."));
    }
    const odgData   = fs.readFileSync(odgFileName);
    const svgSource = await exportSVG(odgFileName);
    const title     = path.basename(odgFileName).replace(/\.odg$/i, "");
    return buildLayeredSVG(odgData, svgSource, title);
}
