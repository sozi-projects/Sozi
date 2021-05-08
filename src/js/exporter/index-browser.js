/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** Export a presentation to a PDF document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export function exportToPDF(presentation, htmlFileName) {
    console.log("Export to PDF not supported on this platform.");
    return Promise.resolve();
}

/** Export a presentation to a PPTX document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export function exportToPPTX(presentation, htmlFileName) {
    console.log("Export to PPTX not supported on this platform.");
    return Promise.resolve();
}

/** Export a presentation to a video document.
 *
 * @param {module:model/Presentation.Presentation} presentation - The presentation to export.
 * @param {string} htmlFileName - The name of the presentation HTML file.
 * @returns {Promise} - A promise that resolves when the operation completes.
 */
export function exportToVideo(presentation, htmlFileName) {
    console.log("Export to video not supported on this platform.");
    return Promise.resolve();
}
