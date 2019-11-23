/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {AbstractBackend, addBackend} from "./AbstractBackend";

/** Google Drive backend.
 *
 * @category backend
 * @extends AbstractBackend
 * @todo Add documentation.
 */
export class GoogleDrive extends AbstractBackend {

    constructor(controller, container) {
        const _ = controller.gettext;

        AbstractBackend.init.call(this, controller, container, "sozi-editor-backend-GoogleDrive-input", _("Open an SVG file from Google Drive"));

        // Save automatically when the window loses focus
        this.addListener("blur", () => this.doAutosave());

        this.clickToAuth = () => this.authorize(false);

        gapi.client.setApiKey(GoogleDrive.apiKey);
        this.authorize(true);
    }

    openFileChooser() {
        this.picker.setVisible(true);
    }

    authorize(onInit) {
        gapi.auth.authorize({
            client_id: GoogleDrive.clientId,
            scope: "https://www.googleapis.com/auth/drive",
            immediate: onInit
        }, authResult => this.onAuthResult(onInit, authResult));
    }

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
                            this.load(response);
                        }
                        else {
                            console.log(response.error.message);
                        }
                    });
                }
            }).
            build();
    }

    getName(fileDescriptor) {
        return fileDescriptor.title;
    }

    getLocation(fileDescriptor) {
        return fileDescriptor.parents;
    }

    find(name, location, callback) {
        function findInParent(index) {
            gapi.client.drive.files.list({
                q: "title = '" + name + "' and " +
                   "'" + location[index].id + "' in parents"
            }).execute(response => {
                if (response.items && response.items.length) {
                    callback(response.items[0]);
                }
                else if (index < location.length - 1) {
                    findInParent(index + 1);
                }
                else {
                    callback(null);
                }
            });
        }
        findInParent(0);
    }

    // TODO implement the "change" event
    load(fileDescriptor) {
        // The file is loaded using an AJAX GET operation.
        // The data type is forced to "text" to prevent parsing it.
        // Emit the "load" event with the file content in case of success,
        // or with the error status in case of failure.
        const xhr = new XMLHttpRequest();
        xhr.open("GET", fileDescriptor.downloadUrl);
        xhr.setRequestHeader("Content-Type", fileDescriptor.mimeType);
        xhr.setRequestHeader("Authorization", "Bearer " + this.accessToken);
        xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    this.emit("load", fileDescriptor, xhr.responseText);
                }
                else {
                    this.emit("load", fileDescriptor, null, xhr.status);
                }
            }
        });
        xhr.send();
    }

    create(name, location, mimeType, data, callback) {
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
            if (!response.error) {
                callback(response);
            }
            else {
                callback(response, response.error.message);
            }
        });
    }

    save(fileDescriptor, data) {
        const base64Data = toBase64(data); // Force UTF-8 encoding
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
            this.emit("save", fileDescriptor, response.error);
        });
    }
}

function toBase64(data) {
    return btoa(unescape(encodeURIComponent(data)));
}

// Configure these settings in GoogleDrive.config.js
GoogleDrive.clientId = "Your OAuth client Id";
GoogleDrive.apiKey = "Your developer API key";

addBackend(GoogleDrive);
