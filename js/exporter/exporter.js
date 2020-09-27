/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {remote, ipcRenderer} from "electron";
import * as path from "path";
import * as tmp from "tmp";
import * as fs from "fs";
import {PDFDocument} from "pdf-lib";
import officegen from "officegen";

/** Update the status of a sequence of frame numbers to include or exclude in the export.
 *
 * @param {boolean[]} list - The status of each frame of the presentation.
 * @param {number} first - The index of the first element to update.
 * @param {number} last - The index of the last element to update.
 * @param {number} step - The step between elements to update.
 * @param {boolean} value - The value to assign at each index.
 */
function markInterval(list, first, last, step, value) {
    if (step > 0) {
        for (let i = first; i <= last; i += step) {
            if (i >= 0 && i < list.length) {
                list[i] = value;
            }
        }
    }
}

/** Parse a list of frames to include or exclude from the export.
 *
 * ```
 * expr ::= interval ("," interval)*
 *
 * interval ::=
 *      INT                     // frame number
 *    | INT? ":" INT?           // first:last
 *    | INT? ":" INT? ":" INT?  // first:second:last
 * ```
 *
 * In an interval:
 * - If `first` is omitted, it is set to 1.
 * - If `second` is omitted, it is set to `first + 1`.
 * - If `last` is omitted, it is set to `list.length`.
 *
 * @param {boolean[]} list - The status of each frame of the presentation.
 * @param {string} expr - An expression that represents a list of frame.
 * @param {boolean} value - The value to assign for each frame to mark.
 */
function markFrames(list, expr, value) {
    switch (expr) {
        case "all":
            markInterval(list, 0, list.length - 1, 1, value);
            break;
        case "none":
            break;
        default:
            for (let intervalDef of expr.split(",")) {
                const interval = intervalDef.split(":").map(s => s.trim());
                if (interval.length > 0) {
                    const first  = interval[0]                        !== "" ? parseInt(interval[0])                   - 1 : 0;
                    const last   = interval[interval.length - 1]      !== "" ? parseInt(interval[interval.length - 1]) - 1 : list.length - 1;
                    const second = interval.length > 2 && interval[1] !== "" ? parseInt(interval[1])                   - 1 : first + 1;
                    if (!isNaN(first) && !isNaN(second) && !isNaN(last)) {
                        markInterval(list, first, last, second - first, value);
                    }
                }
            }
    }
}

/** Get the index of a frame to include in the export, after a given index.
 *
 * @param {boolean[]} list - The status of each frame of the presentation.
 * @param {number} index - The index of the current frame.
 * @returns {number} - The index of the next frame that is marked for inclusion.
 */
function nextFrameIndex(list, index=-1) {
    for (let i = index + 1; i < list.length; i ++) {
        if (list[i]) {
            return i;
        }
    }
    return -1;
}

/** Pad an integer value with zeros.
 *
 * @param {number} value - A value to pad.
 * @param {number} digits - The number of digits in the result.
 * @returns {string} - A zero-padded representation of the given value.
 */
function zeroPadded(value, digits) {
    let result = value.toString();
    while(result.length < digits) {
        result = "0" + result;
    }
    return result;
}

/** The available page sizes for PDF export.
 *
 * Page sizes are in millimeters for each format supported by the
 * `printToPDF` function of the Electron API.
 *
 * @readonly
 * @type {object} */
const pageGeometry = {
    A3:      {width: 297,   height: 420},
    A4:      {width: 210,   height: 297},
    A5:      {width: 148,   height: 210},
    Legal:   {width: 216,   height: 355.6},
    Letter:  {width: 215.9, height: 279.4},
    Tabloid: {width: 279,   height: 432},
};

/** The default scale of web pages.
 *
 * This value is 96 dpi, converted to pixels per millimeter.
 *
 * @readonly
 * @default
 * @type {number} */
const pixelsPerMm = 3.78;

/** Export a presentation to a PDF document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export async function exportToPDF(presentation, htmlFileName) {
    console.log(`Exporting ${htmlFileName} to PDF`);

    // Mark the list of frames that will be included in the target document.
    const frameCount = presentation.frames.length;
    const frameSelection = new Array(frameCount);
    let include = presentation.exportToPDFInclude.trim();
    if (!include.length) {
        include = "all";
    }
    let exclude = presentation.exportToPDFExclude.trim();
    if (!exclude.length) {
        exclude = "none";
    }
    markInterval(frameSelection, 0, frameCount - 1, 1, false);
    markFrames(frameSelection, include, true);
    markFrames(frameSelection, exclude, false);

    // The length of the file suffix for each generated page.
    const digits = frameCount.toString().length;

    // Open the HTML presentation in a new browser window.
    let g = pageGeometry[presentation.exportToPDFPageSize];
    if (presentation.exportToPDFPageOrientation === "landscape") {
        g = {width: g.height, height: g.width};
    }
    const w = new remote.BrowserWindow({
        width:  Math.round(g.width  * pixelsPerMm),
        height: Math.round(g.height * pixelsPerMm),
        frame: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${htmlFileName}`);

    // Create a PDF document object.
    const pdfDoc = await PDFDocument.create();

    // On each frameChange event in the player, save the current web contents.
    const result = new Promise((resolve, reject) => {
        ipcRenderer.on("frameChange", async (evt, index) => {
            // Convert the current web contents to PDF and add it to the target document.
            const pdfData = await w.webContents.printToPDF({
                pageSize:  presentation.exportToPDFPageSize,
                landscape: presentation.exportToPDFPageOrientation === "landscape",
                marginsType: 2, // No margin
            });

            const pdfDocForFrame = await PDFDocument.load(pdfData);
            const [pdfPage]      = await pdfDoc.copyPages(pdfDocForFrame, [0]);
            pdfDoc.addPage(pdfPage);

            const frameIndex = nextFrameIndex(frameSelection, index);
            if (frameIndex >= 0) {
                // If there are frames remaining, move to the next frame.
                w.webContents.send("jumpToFrame", frameIndex);
            }
            else {
                // If this is the last frame, close the presentation window
                // and write the PDF document to a file.
                ipcRenderer.removeAllListeners("frameChange");
                w.close();

                const pdfFileName = htmlFileName.replace(/html$/, "pdf");
                const pdfBytes    = await pdfDoc.save();
                fs.writeFile(pdfFileName, pdfBytes, err => {
                    if (err) {
                        reject();
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    });

    // Start the player in the presentation window.
    w.webContents.send("exportFrames", {
        frameIndex: nextFrameIndex(frameSelection),
        callerId: remote.getCurrentWindow().webContents.id
    });

    return result;
}

/** Export a presentation to a PPTX document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export async function exportToPPTX(presentation, htmlFileName) {
    console.log(`Exporting ${htmlFileName} to PPTX`);

    // Mark the list of frames that will be included in the target document.
    const frameCount = presentation.frames.length;
    const frameSelection = new Array(frameCount);
    let include = presentation.exportToPPTXInclude.trim();
    if (!include.length) {
        include = "all";
    }
    let exclude = presentation.exportToPPTXExclude.trim();
    if (!exclude.length) {
        exclude = "none";
    }
    markInterval(frameSelection, 0, frameCount - 1, 1, false);
    markFrames(frameSelection, include, true);
    markFrames(frameSelection, exclude, false);

    // The length of the file suffix for each generated image.
    const digits = frameCount.toString().length;

    // Open the HTML presentation in a new browser window.
    const w = new remote.BrowserWindow({
        width:  presentation.exportToPPTXWidth,
        height: presentation.exportToPPTXHeight,
        frame: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${htmlFileName}`);

    // Create a PPTX document object.
    const pptxDoc = officegen("pptx");

    // On each frameChange event in the player, save the current web contents.
    const result = new Promise((resolve, reject) => {
        pptxDoc.on("finalize", resolve);
        pptxDoc.on("error", reject);
    });

    // Create a temporary directory.
    // Force deletion on cleanup, even if not empty.
    var tmpDir = tmp.dirSync({unsafeCleanup: true}).name;

    // The number of digits to represent zero-padded frame numbers.
    const indexDigits = frameCount.toString().length;

    ipcRenderer.on("frameChange", async (evt, index) => {
        // Convert the current web contents to a PNG image.
        const img = await w.webContents.capturePage();
        const png = img.toPNG();
        const indexStr = zeroPadded(index, indexDigits);
        const fileName = path.join(tmpDir, `${indexStr}.png`);
        fs.writeFileSync(fileName, png);

        // Insert the image into a new slide.
        const slide = pptxDoc.makeNewSlide();
        slide.addImage(fileName, {x: 0, y: 0, cx: "100%", cy: "100%" });

        const frameIndex = nextFrameIndex(frameSelection, index);
        if (frameIndex >= 0) {
            // If there are frames remaining, move to the next frame.
            w.webContents.send("jumpToFrame", frameIndex);
        }
        else {
            // If this is the last frame, close the presentation window
            // and write the PPTX document to a file.
            ipcRenderer.removeAllListeners("frameChange");
            w.close();

            const pptxFileName = htmlFileName.replace(/html$/, "pptx");
            const out = fs.createWriteStream(pptxFileName);
            pptxDoc.generate(out);
        }
    });

    // Start the player in the presentation window.
    w.webContents.send("exportFrames", {
        frameIndex: nextFrameIndex(frameSelection),
        callerId: remote.getCurrentWindow().webContents.id
    });

    return result;
}
