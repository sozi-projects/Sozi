/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Internationalization support in the presentation editor.
 *
 * @module
 */

/** Returns the supported languages in the user interface of Sozi.
 *
 * @param {Function} _ - The `gettext` function.
 * @returns {object} - A dictionary that maps language tags to language names.
 */
export function getLanguages(_) {
    return {
        auto: _("System language"),
        ar: "العربية",
        bg: "български език",
        ca: "Català",
        cs: "Čeština",
        da: "Dansk",
        de: "Deutsch",
        en: "English",
        eo: "Esperanto",
        es: "Español",
        et: "Eesti",
        fa: "فارسی",
        fi: "Suomi",
        fr: "Français",
        gl: "Galego",
        he: "עִבְרִית",
        hu: "Magyar",
        id: "Bahasa Indonesia",
        it: "Italiano",
        ja: "日本語",
        kab: "شئعم",
        ko: "한국어",
        lt: "Lietuvių",
        ms: "Bahasa Melayu",
        nb: "Norsk (Bokmål)",
        nl: "Nederlands",
        nn: "Norsk (Nynorsk)",
        pl: "Język polski",
        pt_BR: "Português (Brasil)",
        pt: "Português",
        ru: "Русский",
        sk: "Slovenčina",
        sv: "Svenska",
        tr: "Türkçe",
        zh_Hans: "简体中文",
        zh_Latn: "Hànyǔ Pīnyīn",
        zh_TW: "繁體字",
    };
}
