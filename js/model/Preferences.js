
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/** Sozi editor preferences.
 *
 * @category model
 *
 * @todo Add documentation.
 */
export class Preferences {
    constructor() {
        this.fontSize            = 11;
        this.enableNotifications = true;
        this.animateTransitions  = true;
        this.saveMode            = "onblur";
        this.reloadMode          = "auto";
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
        }
    }

    save() {
        for (let key of Object.keys(this)) {
            localStorage.setItem(key, JSON.stringify(this[key]));
        }
    }

    load() {
        for (let key of Object.keys(this)) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                this[key] = JSON.parse(value);
            }
        }
    }
};
