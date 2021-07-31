
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** @module */

/** Sozi editor preferences. */
export class Preferences {
    /** Initialize a preferences object with default values. */
    constructor() {
        /** The preferred language of the user interface.
         *
         * The value of this property should be a [BCP 47 language tag](https://tools.ietf.org/rfc/bcp/bcp47.txt)
         * with an [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes),
         * or `"auto"` to let the editor use the system default language.
         *
         * @default
         * @type {string}
         */
        this.language = "auto";

        /** The preferred font size, in points (pt).
         *
         * @default
         * @type {number}
         */
        this.fontSize = 11;

        /** Enable notifications on file save and reload.
         *
         * @default
         * @type {boolean}
         */
        this.enableNotifications = true;

        /** Animate the transitions when moving from one frame to another in the editor.
         *
         * @default
         * @type {boolean}
         */
        this.animateTransitions = true;

        /** When to save an edited presentation.
         *
         * Supported values are:
         * - `"onblur"`: save when the editor window loses focus.
         * - `"manual"`: save only on user request.
         *
         * @default
         * @type {string}
         */
        this.saveMode = "onblur";

        /** When to reload an externally modified SVG document.
         *
         * Supported values are:
         * - `"auto"`: reload immediately.
         * - `"onfocus"`: reload when the editor window gains the focus.
         * - `"manual"`: reload only on user request.
         *
         * @default
         * @type {string}
         */
        this.reloadMode = "auto";

        /** The supported keyboard shortcuts.
         *
         * A keyboard shortcut is represented as a [key identifier](https://developer.mozilla.org/fr/docs/Web/API/KeyboardEvent/key/Key_Values),
         * optionally preceded by one or more modifiers (`"Ctrl+"`, `"Alt+"`, `"Shift+"`).
         *
         * Examples:
         * - `"A"`: the letter "A"
         * - `"ArrowLeft"`: the left arrow key.
         * - `"Ctrl+Shift+ArrowLeft"`: Ctrl, Shift, and the left arrow key simultaneously.
         *
         * @type {object}
         * @property {string} autoselectOutlineElement - Detect and select the outline element in the current frame and selected layers
         * @property {string} resetLayer - Reset the selected layers to their default geometry
         * @property {string} addFrame - Create a new frame
         * @property {string} save - Save the presentation
         * @property {string} redo - Execute the latest undone action
         * @property {string} undo - Undo the latest action
         * @property {string} focusTitleField - Give the focus to the "Frame title" field in the properties pane
         * @property {string} reload - Reload the SVG document
         * @property {string} toggleFullscreen - Enter or exit fullscreen mode
         * @property {string} toggleDevTools - Open or close the developer tools
         */
        this.keys                = {
            autoselectOutlineElement: "Ctrl+E",
            resetLayer              : "Ctrl+R",
            addFrame                : "Ctrl+N",
            save                    : "Ctrl+S",
            redo                    : "Ctrl+Y",
            undo                    : "Ctrl+Z",
            focusTitleField         : "F2",
            reload                  : "F5",
            toggleFullscreen        : "F11",
            toggleDevTools          : "F12"
        };
    }

    /** Save the preferences to local storage */
    save() {
        for (let key of Object.keys(this)) {
            localStorage.setItem(key, JSON.stringify(this[key]));
        }
    }

    /** Load the preferences from local storage */
    load() {
        for (let key of Object.keys(this)) {
            const value = localStorage.getItem(key);
            if (value === null) {
                return;
            }
            const pref = JSON.parse(value);
            if (typeof pref === "object") {
                for (let [fieldName, fieldValue] of Object.entries(pref)) {
                    this[key][fieldName] = fieldValue;
                }
            }
            else {
                this[key] = JSON.parse(value);
            }
        }
    }
}
