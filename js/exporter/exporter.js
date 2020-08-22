/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {remote, ipcRenderer} from "electron";
import * as path from "path";
import * as tmp from "tmp";
import * as fs from "fs";
import {PDFDocument} from "pdf-lib";

function markInterval(list, first, last, step, value) {
    if (step > 0) {
        for (let i = first; i <= last; i += step) {
            if (i >= 0 && i < list.length) {
                list[i] = value;
            }
        }
    }
}

/*
 * Parse an expression and mark the corresponding frames with the given value.
 *
 * expr ::= interval ("," interval)*
 *
 * interval ::=
 *      INT                     // frame number
 *    | INT? ":" INT?           // first:last
 *    | INT? ":" INT? ":" INT?  // first:second:last
 *
 * If first is omitted, it is set to 1.
 * If second is omitted, it is set to first + 1.
 * If last is omitted, it is set to list.length.
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

function nextFrameIndex(list, index=-1) {
    for (let i = index + 1; i < list.length; i ++) {
        if (list[i]) {
            return i;
        }
    }
    return -1;
}

function zeroPadded(value, digits) {
    let result = value.toString();
    while(result.length < digits) {
        result = "0" + result;
    }
    return result;
}

const pageGeometry = {
    A3:      {width: 297,   height: 420},
    A4:      {width: 210,   height: 297},
    A5:      {width: 148,   height: 210},
    Legal:   {width: 216,   height: 355.6},
    Letter:  {width: 215.9, height: 279.4},
    Tabloid: {width: 279,   height: 432},
};

const pixelsPerMm = 12;

export async function exportToPDF(controller) {
    const _ = controller.gettext;
    const htmlFileName = controller.storage.htmlFileDescriptor;
    const pdfFileName  = htmlFileName.replace(/html$/, "pdf");

    console.log(`Exporting ${htmlFileName} to PDF`);

    // Mark the list of frames that will be included in the target document.
    const frameCount = controller.presentation.frames.length;
    const frameSelection = new Array(frameCount);
    let include = controller.preferences.export.pdfInclude.trim();
    if (!include.length) {
        include = "all";
    }
    let exclude = controller.preferences.export.pdfExclude.trim();
    if (!exclude.length) {
        exclude = "none";
    }
    markInterval(frameSelection, 0, frameCount - 1, 1, false);
    markFrames(frameSelection, include, true);
    markFrames(frameSelection, exclude, false);

    // The length of the file suffix for each generated page.
    const digits = frameCount.toString().length;

    // Open the HTML presentation in a new browser window.
    let g = pageGeometry[controller.preferences.export.pdfPageSize];
    if (controller.preferences.export.pdfPageOrientation === "landscape") {
        g = {width: g.height, height: g.width};
    }
    const w = new remote.BrowserWindow({
        width:  g.width  * pixelsPerMm,
        height: g.height * pixelsPerMm,
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${controller.storage.htmlFileDescriptor}`);

    // Create a PDF document object.
    const pdfDoc = await PDFDocument.create();

    // On each frameChange event in the player, save the current web contents.
    ipcRenderer.on("frameChange", async (evt, index) => {
        // Convert the current web contents to PDF and add it to the target document.
        const pdfData = await w.webContents.printToPDF({
            pageSize: controller.preferences.export.pdfPageSize,
            landscape: controller.preferences.export.pdfPageOrientation === "landscape",
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

            const pdfBytes = await pdfDoc.save();
            try {
                fs.writeFileSync(pdfFileName, pdfBytes);
                controller.info(_("Presentation was exported to PDF."));
            }
            catch (e) {
                controller.error(_("Failed to write PDF file."));
            }
        }
    });

    // Start the player in the presentation window.
    w.webContents.send("exportFrames", {
        frameIndex: nextFrameIndex(frameSelection),
        callerId: remote.getCurrentWindow().webContents.id
    });
}
