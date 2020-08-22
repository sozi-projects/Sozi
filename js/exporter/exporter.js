/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

import {remote, ipcRenderer} from "electron";
import * as path from "path";
import * as tmp from "tmp";
import * as fs from "fs";

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

export async function exportToPDF(controller) {
    console.log(`Exporting ${controller.storage.htmlFileDescriptor} to PDF`);

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

    // Create a temporary directory.
    // Force deletion on cleanup, even if not empty.
    const tmpDir = tmp.dirSync({unsafeCleanup: true}).name;

    // Open the HTML presentation in a new browser window.
    const w = new remote.BrowserWindow({
        width:  800, // TODO infer from page size
        height: 600, // TODO infer from page size
        webPreferences: {
            preload: path.join(__dirname, "exporter-preload.js")
        }
    });
    await w.loadURL(`file://${controller.storage.htmlFileDescriptor}`);

    // On each frameChange event in the player, save the current web contents.
    ipcRenderer.on("frameChange", async (evt, index) => {
        const pdfFileName = path.join(tmpDir, zeroPadded(index, digits) + ".pdf");
        console.log(`Saving frame: ${index} as ${pdfFileName}`);

        // Save the current web contents to a PDF file.
        const pdfData = await w.webContents.printToPDF({
            pageSize: controller.preferences.export.pdfPageSize
        });
        try {
            fs.writeFileSync(pdfFileName, pdfData);
        }
        catch (e) {
            console.log("exportToPDF: file write error");
        }

        // Move to the next frame.
        const frameIndex = nextFrameIndex(frameSelection, index);
        if (frameIndex >= 0) {
            w.webContents.send("jumpToFrame", frameIndex);
        }
        else {
            ipcRenderer.removeAllListeners("frameChange");
            // TODO merge pages into a single document.
            w.close();
        }
    });

    // Start the player in the presentation window.
    w.webContents.send("exportFrames", {
        frameIndex: nextFrameIndex(frameSelection),
        callerId: remote.getCurrentWindow().webContents.id
    });
}
