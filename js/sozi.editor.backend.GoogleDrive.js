namespace("sozi.editor.backend", function (exports) {
    "use strict";

    exports.GoogleDrive = sozi.model.Object.clone({
        // Configure these settings in sozi.editor.backend.GoogleDrive.config.js
        clientId: "Your OAuth client Id",
        apiKey: "Your developer API key",
        
        init: function () {
            $("#sozi-editor-view-preview ul").append('<li><input id="sozi-editor-backend-GoogleDrive-auth" type="button" style="display: none" value="Authorize Google Drive"><input id="sozi-editor-backend-GoogleDrive-input" type="button" style="display: none" value="Load from Google Drive"></li>');
            gapi.client.setApiKey(this.apiKey);
            this.authorize(true);
            return this;
        },
        
        authorize: function (immediate) {
            gapi.auth.authorize({
                client_id: this.clientId,
                scope: "https://www.googleapis.com/auth/drive",
                immediate: immediate
            }, this.bind(this.onAuthResult));
        },
        
        onAuthResult: function (authResult) {
            var authButton = $("#sozi-editor-backend-GoogleDrive-auth").css({display: "none"});
            var inputButton = $("#sozi-editor-backend-GoogleDrive-input").css({display: "none"});
            
            var self = this;
            
            if (authResult && !authResult.error) {
                this.accessToken = authResult.access_token;
                // Access granted: create a file picker and show the "Load" button.
                gapi.load("picker", {
                    callback: function () {
                        self.createPicker();
                        inputButton.css({display: "block"}).click(function () {
                            self.picker.setVisible(true);
                        });
                    }
                });
                gapi.client.load("drive", "v2");
            }
            else {
                // No access token could be retrieved, show the button to start the authorization flow.
                authButton.css({display: "block"}).click(function () {
                    self.authorize(false);
                });
            }
        },
        
        createPicker: function () {
            var self = this;
            
            this.picker = new google.picker.PickerBuilder().
                addView(google.picker.DocsView).
                setOAuthToken(this.accessToken).
                setDeveloperKey(this.apiKey).
                setCallback(function (data) {
                    if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                        gapi.client.drive.files.get({fileId: data.docs[0].id}).execute(function (response) {
                            if (!response.error) {
                                self.load({
                                    name: response.title,
                                    location: response.downloadUrl,
                                    parents: response.parents,
                                    type: response.mimeType,
                                    status: null,
                                    content: null
                                });
                            }
                            else {
                                console.log(response.error.message);
                            }
                        });
                    }
                }).
                build();
        },
        
        load: function (fileDescriptor) {
            // If the location of the file is unknown,
            // try to find it based on it name and parents.
            if (fileDescriptor.location === undefined) {
                var found;
                for (var i = 0; i < fileDescriptor.parents.length && !found; i ++) {
                    gapi.client.drive.files.list({
                        q: "title = '" + fileDescriptor.name + "' and " +
                           "'" + fileDescriptor.parents[i].id + "' in parents"
                    }).execute(function (response) {
                        if (response.items && response.items.length) {
                            found = response.items[0];
                        }
                    });
                }
                
                // If no file with the given name has been found
                // in the given list of parents, fire the "load" event
                // with the "Not found" status.
                if (!found) {
                    fileDescriptor.status = "Not found";
                    this.fire("load", fileDescriptor);
                    return;
                }
                
                // If a file was found, fill the missing properties
                // and load it.
                fileDescriptor.location = found.downloadUrl;
                fileDescriptor.parents = found.parents;
                fileDescriptor.type = found.mimeType;
            }
            
            // The file is loaded using an AJAX GET operation.
            // The data type is forced to "text" to prevent parsing it.
            // Fire the "load" event with the file content in case of success,
            // or with the error status in case of failure.
            $.ajax(fileDescriptor.location, {
                contentType: fileDescriptor.type,
                dataType: "text",
                headers: {
                    "Authorization": "Bearer " + this.accessToken
                },
                context: this
            }).done(function (data) {
                fileDescriptor.content = data;
                this.fire("load", fileDescriptor);
            }).fail(function (xhr, status) {
                fileDescriptor.status = status;
                this.fire("load", fileDescriptor);
            });
            
            // TODO watch file for modifications
        },
        
        save: function (fileDescriptor) {
            var boundary = "-------314159265358979323846";
            var delimiter = "\r\n--" + boundary + "\r\n";
            var closeDelimiter = "\r\n--" + boundary + "--";

            if (fileDescriptor.location === undefined) {
                var contentType = fileDescriptor.type || "application/octet-stream";
                
                var metadata = {
                    title: fileDescriptor.name,
                    parents: fileDescriptor.parents,
                    mimeType: contentType
                };

                var multipartRequestBody =
                    delimiter +
                    "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata) +
                    delimiter +
                    "Content-Type: " + contentType + "\r\n" +
                    "Content-Transfer-Encoding: base64\r\n\r\n" +
                    btoa(fileDescriptor.content) +
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
                }).execute(function (response) {
                    if (!response.error) {
                        fileDescriptor.status = response.error.message;
                    }
                    else {
                        fileDescriptor.location = response.downloadUrl;
                        fileDescriptor.type = response.mimeType;
                    }
                    this.fire("save", fileDescriptor);
                });
                return;
            }
            
            // TODO implement saving
            this.fire("save", fileDescriptor);
        }
    });
});
