/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Jed from "jed";
import locales from "./locales";

// Convert a language tag to a dash-separated lowercase string
function normalize(tag) {
    return tag.replace(/_/g, "-").toLowerCase();
}

export function init(lang) {
    if (!lang) {
        lang = window.navigator.languages && window.navigator.languages.length ?
            window.navigator.languages[0] :
            (window.navigator.language || window.navigator.userLanguage || "en");
    }

    // Normalize the given language tag and extract the language code alone
    lang = normalize(lang);
    let langShort = lang.split("-")[0];

    // Find the user language in the available locales
    let allLanguages = Object.keys(locales).map(normalize);
    let langIndex = allLanguages.indexOf(lang);
    if (langIndex < 0) {
        langIndex = allLanguages.indexOf(langShort);
    }

    let localeData = langIndex >= 0 ? locales[Object.keys(locales)[langIndex]] : {};

    return new Jed(localeData);
}
