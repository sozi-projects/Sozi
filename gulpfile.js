
const {src, dest, series, parallel} = require("gulp");
const util      = require("util");
const path      = require("path")
const writeFile = util.promisify(require("fs").writeFile);
const exec      = util.promisify(require("child_process").exec);
const glob      = util.promisify(require("glob"));
const through   = require("through2");
const jspot     = require("jspot");
const po2json   = util.promisify(require("po2json").parseFile);

/* -------------------------------------------------------------------------- *
 * Internationalization
 * -------------------------------------------------------------------------- */

async function jspotTask() {
    const files = await glob("src/**/*.js");
    return jspot.extract({
        keyword: "_",
        parserOptions: {
            sourceType: "module",
            ecmaVersion: 9
        },
        source: files,
        target: "locales"
    });
}

async function msgmergeTask() {
    const files = await glob("locales/*.po");
    await Promise.all(files.map(f => exec(`msgmerge -U ${f} locales/messages.pot`)))
}

async function po2jsonTask() {
    const files = await glob("locales/*.po");
    // Convert each file to a JS object.
    const data = await Promise.all(files.map(f => po2json(f, {
        fuzzy: false,
        format: "jed"
    })));
    // Merge all JS objects.
    const obj = {};
    for (const item of data) {
        obj[item.locale_data.messages[""].lang] = item;
    }
    // Convert the result to a nodejs module.
    const content = `module.exports = ${JSON.stringify(obj)};`;
    // TODO make sure the target directory exists.
    await writeFile("build/electron/src/js/locales.js", content);
}

const i18nTask = series(jspotTask, msgmergeTask, po2jsonTask);

exports.default = i18nTask;
