/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Jed from "jed";
import locales from "./locales";

export function init(lang) {
    if (!lang) {
        lang = window.navigator.languages && window.navigator.languages.length ?
            window.navigator.languages[0] :
            (window.navigator.language || window.navigator.userLanguage || "en");
    }

    var langShort = lang.split(/[-_]/)[0];

    var localeData = locales[lang] || locales[langShort] || {};

    return new Jed(localeData);
}
