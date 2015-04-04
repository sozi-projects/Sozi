/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Jed from "jed";

export function init() {
    return $.getJSON("locales/fr.json").then(resp => {
        return new Jed(resp);
    }, (jqxhr, status, err) => {
        console.log( "Could not load locale: " + status + ", " + err);
        return new Jed({});
    });
}
