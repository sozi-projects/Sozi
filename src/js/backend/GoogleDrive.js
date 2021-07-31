/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/* global google, gapi */

import {AbstractBackend, addBackend} from "./AbstractBackend";

/** Google Drive backend.
 *
 * @extends module:backend/AbstractBackend.AbstractBackend
 */
export class GoogleDrive extends AbstractBackend {

    /** Initialize a Sozi  backend based on the Google Drive API.
     *
     * @param {module:Controller.Controller} controller - A controller instance.
     * @param {HTMLElement} container - The element that will contain the menu for choosing a backend.
     */
    constructor(controller, container) {
        const _ = controller.gettext;

        super(controller, container, "sozi-editor-backend-GoogleDrive-input", _("Open an SVG file from Google Drive"));

        this.clickToAuth = () => this.authorize(false);

        gapi.client.setApiKey(GoogleDrive.apiKey);
        this.authorize(true);
    }

    /** @inheritdoc */
    openFileChooser() {
        this.picker.setVisible(true);
    }

    /** Authorize access to the Google Drive API.
     *
     * @private
     * @param {boolean} onInit - `true` if this is the first authorization request in this session.
     */
    authorize(onInit) {
        gapi.auth.authorize({
            client_id: GoogleDrive.clientId,
            scope: "https://www.googleapis.com/auth/drive",
            immediate: onInit
        }, authResult => this.onAuthResult(onInit, authResult));
    }

    /** Process a Google Drive API authorization result.
     *
     * Called on completion of the authorization request.
     *
     * @private
     * @param {boolean} onInit - `true` if this is the first authorization request in this session.
     * @param {object} authResult - The authorization result.
     */
    onAuthResult(onInit, authResult) {
        const inputButton = document.getElementById("sozi-editor-backend-GoogleDrive-input");

        if (authResult && !authResult.error) {
            this.accessToken = authResult.access_token;
            // Access granted: create a file picker and show the "Load" button.
            gapi.client.load("drive", "v2");
            gapi.load("picker", {
                callback: () => {
                    this.createPicker();
                    inputButton.removeEventListener("click", this.clickToAuth);
                    inputButton.addEventListener("click", () => this.openFileChooser());
                    if (!onInit) {
                        this.openFileChooser();
                    }
                }
            });
        }
        else {
            // No access token could be retrieved, show the button to start the authorization flow.
            inputButton.addEventListener("click", this.clickToAuth);
        }
    }

    /** Create a Google Drive file picker.
     *
     * @private
     */
    createPicker() {
        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("image/svg+xml");

        this.picker = new google.picker.PickerBuilder().
            addView(view).
            setOAuthToken(this.accessToken).
            setCallback(data => {
                if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                    gapi.client.drive.files.get({fileId: data.docs[0].id}).execute(response => {
                        if (!response.error) {
                            this.controller.storage.setSVGFile(response, this);
                        }
                        else {
                            console.log(response.error.message);
                        }
                    });
                }
            }).
            build();
    }

    /** @inheritdoc */
    getName(fileDescriptor) {
        return fileDescriptor.title;
    }

    /** @inheritdoc */
    getLocation(fileDescriptor) {
        return fileDescriptor.parents;
    }

    /** @inheritdoc */
    sameFile(fd1, fd2) {
        return fd1.id === fd2.id;
    }

    /** @inheritdoc */
    find(name, location) {
        return new Promise((resolve, reject) => {
            function findInParent(index) {
                gapi.client.drive.files.list({
                    q: "title = '" + name + "' and " +
                       "'" + location[index].id + "' in parents"
                }).execute(response => {
                    if (response.items && response.items.length) {
                        resolve(response.items[0]);
                    }
                    else if (index < location.length - 1) {
                        findInParent(index + 1);
                    }
                    else {
                        reject("Not found");
                    }
                });
            }
            findInParent(0);
        });
    }

    /** @inheritdoc */
    load(fileDescriptor) {
        // TODO implement the "change" event
        // The file is loaded using an AJAX GET operation.
        // The data type is forced to "text" to prevent parsing it.
        const xhr = new XMLHttpRequest();
        xhr.open("GET", fileDescriptor.downloadUrl);
        xhr.setRequestHeader("Content-Type", fileDescriptor.mimeType);
        xhr.setRequestHeader("Authorization", "Bearer " + this.accessToken);
        return new Promise((resolve, reject) => {
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    }
                    else {
                        reject(xhr.status);
                    }
                }
            });
            xhr.send();
        });
    }

    /** @inheritdoc */
    create(name, location, mimeType, data) {
        const boundary = "-------314159265358979323846";
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelimiter = "\r\n--" + boundary + "--";

        const metadata = {
            title: name,
            parents: location,
            mimeType
        };

        const multipartRequestBody =
            delimiter +
            "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata) +
            delimiter +
            "Content-Type: " + mimeType + "\r\n" +
            "Content-Transfer-Encoding: base64\r\n\r\n" +
            toBase64(data) + // Force UTF-8 encoding
            closeDelimiter;

        return new Promise((resolve, reject) => {
            gapi.client.request({
                path: "/upload/drive/v2/files",
                method: "POST",
                params: {
                    uploadType: "multipart"
                },
                headers: {
                  "Content-Type": 'multipart/mixed; boundary="' + boundary + '"'
                },
                body: multipartRequestBody
            }).execute(response => {
                if (response.error) {
                    reject(response.error.message);
                }
                else {
                    resolve(response);
                }
            });
        });
    }

    /** @inheritdoc */
    save(fileDescriptor, data) {
        const base64Data = toBase64(data); // Force UTF-8 encoding
        return new Promise((resolve, reject) => {
            gapi.client.request({
                path: "/upload/drive/v2/files/" + fileDescriptor.id,
                method: "PUT",
                params: {
                    uploadType: "media"
                },
                headers: {
                    "Content-Type": fileDescriptor.mimeType,
                    "Content-Length": base64Data.length,
                    "Content-Encoding": "base64"
                },
                body: base64Data
            }).execute(response => {
                if (response.error) {
                    reject(response.error.message);
                }
                else {
                    this.controller.storage.onSave(fileDescriptor);
                    resolve(fileDescriptor);
                }
            });
        });
    }
}

/** Encode data to base64.
 *
 * @private
 * @param {string} data - The data to encode.
 * @returns {string} The encoded data.
 */
function toBase64(data) {
    return btoa(unescape(encodeURIComponent(data)));
}

/** The Google Drive OAuth cliend Id.
 *
 * Override the value of this attribute in `GoogleDrive.config.js`.
 *
 * @static
 * @type {string}
 */
GoogleDrive.clientId = "Your OAuth client Id";

/** The Google Drive API key.
 *
 * Override the value of this attribute in `GoogleDrive.config.js`.
 *
 * @static
 * @type {string}
 */
GoogleDrive.apiKey = "Your developer API key";

addBackend(GoogleDrive);
