/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {remote, ipcRenderer} from "electron";
import path from "path";
import process from "process";
import * as tmp from "tmp";
import * as fs from "fs";
import {PDFDocument} from "pdf-lib";
import officegen from "officegen";
import {spawnSync} from "child_process";

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
 * @param {string} expr - An expression that represents a list of frames.
 * @param {boolean} value - The value to assign for each frame to mark.
 */
function markFrames(list, expr, value) {
    expr = expr.trim();
    if (!expr.length) {
        expr = value ? "all" : "none";
    }
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

/** Mark frames to include or exclude from export.
 *
 * @param {module:model/Presentation.Presentation} pres - The presentation to export.
 * @param {string} include - An expression that represents a list of frames to include.
 * @param {string} exclude - An expression that represents a list of frames to exclude.
 * @returns {boolean[]} - The status of each frame in the presentation.
 */
function markFramesFromLists(pres, include, exclude) {
    const result = new Array(pres.frames.length);
    markFrames(result, "all",   false);
    markFrames(result, include, true);
    markFrames(result, exclude, false);
    return result;
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
 * Page sizes are in pixels, assuming a resolution of 96 dpi,
 * for each format supported by the `printToPDF` function of the Electron API.
 * All formats are in landscape mode by default.
 *
 * @readonly
 * @type {object} */
const pdfPageGeometry = {
    A3     : {width: 1587, height: 1123},
    A4     : {width: 1123, height: 794},
    A5     : {width: 794 , height: 559},
    Legal  : {width: 1344, height: 816},
    Letter : {width: 1056, height: 816},
    Tabloid: {width: 1632, height: 1056},
};

/** The available slide sizes for PPTX export.
 *
 * Slide sizes are represented by aspect ratios regardless of a physical size.
 * The export function will assume a screen height equal to 1080 pixels.
 * The keys represent all formats supported by the Officegen PPTX API.
 * All formats are in landscape mode by default.
 *
 * @readonly
 * @type {object} */
const pptxSlideGeometry = {
    "35mm"     : {width: 11.25, height: 7.5}, // in
    A3         : {width: 420,   height: 297}, // mm
    A4         : {width: 297,   height: 210}, // mm
    B4ISO      : {width: 353,   height: 250}, // mm
    B4JIS      : {width: 364,   height: 257}, // mm
    B5ISO      : {width: 250,   height: 176}, // mm
    B5JIS      : {width: 257,   height: 182}, // mm
    banner     : {width: 8,     height: 1},   // in
    hagakiCard : {width: 148,   height: 100}, // mm
    ledger     : {width: 17,    height: 11},  // in
    letter     : {width: 11,    height: 8.5}, // in
    overhead   : {width: 10,    height: 7.5}, // in
    screen16x10: {width: 16,    height: 10},  // no unit
    screen16x9 : {width: 16,    height: 9},   // no unit
    screen4x3  : {width: 4,     height: 3}    // no unit
};

/** The default height of PPTX slides, in pixels.
 *
 * @readonly
 * @default
 * @type {number} */
const pptxSlideHeightPx = 1080;

/** Export a presentation to a PDF document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export async function exportToPDF(presentation, htmlFileName) {
    console.log(`Exporting ${htmlFileName} to PDF`);

    // Mark the list of frames that will be included in the target document.
    const frameSelection = markFramesFromLists(presentation, presentation.exportToPDFInclude, presentation.exportToPDFExclude);

    // Get the PDF page size and swap width and height in protrait orientation.
    let g = pdfPageGeometry[presentation.exportToPDFPageSize];
    if (presentation.exportToPDFPageOrientation === "portrait") {
        g = {width: g.height, height: g.width};
    }

    // Open the HTML presentation in a new browser window.
    const w = new remote.BrowserWindow({
        width : g.width,
        height: g.height,
        frame : false,
        show  : true,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${htmlFileName}`);

    // Create a PDF document object.
    const pdfDoc = await PDFDocument.create();

    const callerId = remote.getCurrentWindow().webContents.id;

    return new Promise((resolve, reject) => {
        // On each jumpToFrame event in the player, save the current web contents.
        ipcRenderer.on("jumpToFrame.done", async (evt, index) => {
            // Convert the current web contents to PDF.
            const pdfData = await w.webContents.printToPDF({
                pageSize:  presentation.exportToPDFPageSize,
                landscape: presentation.exportToPDFPageOrientation === "landscape",
                marginsType: 2, // No margin
            });

            // Add the current PDF page to the document.
            const pdfDocForFrame = await PDFDocument.load(pdfData);
            const [pdfPage]      = await pdfDoc.copyPages(pdfDocForFrame, [0]);
            pdfDoc.addPage(pdfPage);

            // Jump to the next frame.
            const frameIndex = nextFrameIndex(frameSelection, index);
            if (frameIndex >= 0) {
                // If there are frames remaining, move to the next frame.
                w.webContents.send("jumpToFrame", {callerId, frameIndex});
            }
            else {
                // If this is the last frame, close the presentation window
                // and write the PDF document to a file.
                ipcRenderer.removeAllListeners("jumpToFrame.done");
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

        // Start the player in the presentation window.
        w.webContents.send("initializeExporter", {callerId, frameIndex: nextFrameIndex(frameSelection)});
    });
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
    const frameSelection = markFramesFromLists(presentation, presentation.exportToPPTXInclude, presentation.exportToPPTXExclude);

    // Get the PPTX slide size and convert it to pixels.
    const g = pptxSlideGeometry[presentation.exportToPPTXSlideSize];
    g.width  = Math.round(g.width * pptxSlideHeightPx / g.height);
    g.height = pptxSlideHeightPx;

    // Open the HTML presentation in a new browser window.
    // The window must be visible to work with the Page.captureScreenshot
    // message of the Chrome DevTools Protocol.
    const w = new remote.BrowserWindow({
        width : g.width,
        height: g.height,
        frame : false,
        show  : true,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${htmlFileName}`);

    // Create a PPTX document object.
    const pptxDoc = officegen("pptx");
    pptxDoc.setSlideSize(g.width, g.height, presentation.exportToPPTXSlideSize);

    // Create a temporary directory.
    // Force deletion on cleanup, even if not empty.
    const destDir = tmp.dirSync({unsafeCleanup: true});
    console.log("Exporting to " + destDir.name);

    // Generate a list of PNG file names.
    const digits = presentation.frames.length.toString().length;
    const pngFileNames = presentation.frames.map((frame, index) => {
        const indexStr = zeroPadded(index, digits);
        return path.join(destDir.name, `${indexStr}.png`)
    });

    // We will use the Chrome DevTools protocol instead of
    // the unreliable Electron capturePage method.
    w.webContents.debugger.attach("1.2");

    const callerId = remote.getCurrentWindow().webContents.id;

    return new Promise((resolve, reject) => {
        pptxDoc.on("finalize", () => {
            // Remove the temporary image folder, ignoring exceptions on failure.
            try {
                destDir.removeCallback();
            }
            catch (e) {
                console.log(e);
            }
            resolve();
        });

        pptxDoc.on("error", () => {
            // Remove the temporary image folder, ignoring exceptions on failure.
            try {
                destDir.removeCallback();
            }
            catch (e) {
                console.log(e);
            }
            reject();
        });

        // On each jumpToFrame event in the player, save the current web contents.
        ipcRenderer.on("jumpToFrame.done", async (evt, index) => {
            // Capture the current web contents into a PNG image file.
            const img = await w.webContents.debugger.sendCommand("Page.captureScreenshot", {format: "png"});
            fs.writeFileSync(pngFileNames[index], Buffer.from(img.data, "base64"));

            // Add the PNG file to its own slide.
            pptxDoc.makeNewSlide().addImage(pngFileNames[index], {x: 0, y: 0, cx: "100%", cy: "100%" });

            // Jump to the next frame.
            const frameIndex = nextFrameIndex(frameSelection, index);
            if (frameIndex >= 0) {
                // If there are frames remaining, move to the next frame.
                w.webContents.send("jumpToFrame", {callerId, frameIndex});
            }
            else {
                // If this is the last frame, close the presentation window
                // and write the PPTX document to a file.
                ipcRenderer.removeAllListeners("jumpToFrame.done");
                w.close();

                const pptxFileName = htmlFileName.replace(/html$/, "pptx");
                const pptxFile = fs.createWriteStream(pptxFileName);
                pptxDoc.generate(pptxFile);
            }
        });

        // Start the player in the presentation window.
        w.webContents.send("initializeExporter", {callerId, frameIndex: nextFrameIndex(frameSelection)});
    });
}

/** Export a presentation to a video document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export async function exportToVideo(presentation, htmlFileName) {
    console.log(`Exporting ${htmlFileName} to video`);

    // Open the HTML presentation in a new browser window.
    // The window must be visible to work with the Page.captureScreenshot
    // message of the Chrome DevTools Protocol.
    const w = new remote.BrowserWindow({
        width : presentation.exportToVideoWidth,
        height: presentation.exportToVideoHeight,
        frame : false,
        show  : true,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${htmlFileName}`);

    // Create a temporary directory.
    // Force deletion on cleanup, even if not empty.
    let destDir, destDirName;
    if (presentation.exportToVideoFormat === "png") {
        destDirName = htmlFileName.replace(/\.sozi\.html$/, "-sozi-export");
        if (!fs.existsSync(destDirName)) {
            fs.mkdirSync(destDirName);
        }
    }
    else {
        destDir = tmp.dirSync({unsafeCleanup: true});
        destDirName = destDir.name;
    }

    console.log("Exporting to " + destDirName);

    // We will use the Chrome DevTools protocol instead of
    // the unreliable Electron capturePage method.
    w.webContents.debugger.attach("1.2");

    const callerId = remote.getCurrentWindow().webContents.id;

    return new Promise((resolve, reject) => {
        const timeStepMs = 1000 / presentation.exportToVideoFrameRate;
        const frameCount = presentation.frames.length;
        let imgIndex = 0;

        function onDone() {
            ipcRenderer.removeAllListeners("jumpToFrame.done");
            w.close();

            if (presentation.exportToVideoFormat === "png") {
                resolve();
                return;
            }

            const ffmpegOptions = [
                // Frames per second
                "-r", presentation.exportToVideoFrameRate,
                // Convert a sequence of image files
                "-f", "image2",
                // The list of image files
                "-i", path.join(destDirName, "img%d.png"),
                // The video bit rate
                "-b:v", presentation.exportToVideoBitRate,
                // Overwrite the output file without asking
                "-y",
                // The name of the output video file
                htmlFileName.replace(/html$/, presentation.exportToVideoFormat)
            ];

            // Attempt to launch the system-wide FFMPEG executable.
            let res = spawnSync("ffmpeg", ffmpegOptions, {stdio: "inherit"});
            if (res.error) {
                console.log("No global installation of FFMPEG found. Trying the local FFMPEG executable shipped with Sozi.");
                // Attempt to launch the local FFMPEG executable.
                const ffmpegPath = path.join(process.resourcesPath,
                    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
                );
                res = spawnSync(ffmpegPath, ffmpegOptions, {stdio: "inherit"});
            }

            // Remove the temporary image folder, ignoring exceptions on failure.
            try {
                destDir.removeCallback();
            }
            catch (e) {
                console.log(e);
            }

            if (res.error) {
                console.log("Could not launch FFMPEG.");
                reject();
            }
            else {
                console.log("Video export complete.");
                resolve();
            }
        }

        // On each frame change, capture the web contents and animate the transition.
        ipcRenderer.on("jumpToFrame.done", async (evt, index) => {
            // If we jumped to the first frame after a transition,
            // terminate the video export.
            if (index === 0 && imgIndex > 0) {
                onDone();
            }

            const currentFrame = presentation.frames[index];

            // Generate images for the duration of the current frame.
            let firstImgFileName;
            for (let timeMs = 0; timeMs < currentFrame.timeoutMs; timeMs += timeStepMs, imgIndex ++) {
                const imgFileName = path.join(destDirName, `img${imgIndex}.png`)
                if (timeMs === 0) {
                    // Capture the first image of the current frame.
                    const img = await w.webContents.debugger.sendCommand("Page.captureScreenshot", {format: "png"});
                    fs.writeFileSync(imgFileName, Buffer.from(img.data, "base64"));
                    firstImgFileName = imgFileName;
                }
                else {
                    // For the remaining duration of the frame, copy the first image.
                    fs.copyFileSync(firstImgFileName, imgFileName);
                }
            }

            // Get the index of the next frame.
            const targetIndex = (index + 1) % frameCount;

            // Generate images for the transition to the next frame.
            // If the last frame has a timeout enabled, transition to the first frame.
            // Else terminate the video export.
            if (targetIndex > 0 || currentFrame.timeoutEnable) {
                w.webContents.send("moveToNext", {callerId, timeStepMs});
            }
            else {
                onDone();
            }
        });

        // On each animation step, capture the current web contents.
        ipcRenderer.on("moveToNext.step", async evt => {
            const img = await w.webContents.debugger.sendCommand("Page.captureScreenshot", {format: "png"});
            const imgFileName = path.join(destDirName, `img${imgIndex}.png`);
            fs.writeFileSync(imgFileName, Buffer.from(img.data, "base64"));
            w.webContents.send("moveToNext.more");
            imgIndex ++;
        });

        // Start the player in the presentation window.
        w.webContents.send("initializeExporter", {frameIndex: 0, callerId});
    });
}
