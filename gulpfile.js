
const {src, dest, series, parallel} = require("gulp");
const util      = require("util");
const path      = require("path");
const fs        = require("fs");
const exec      = util.promisify(require("child_process").exec);
const glob      = util.promisify(require("glob"));
const log       = require("fancy-log");
const writeFile_ = util.promisify(fs.writeFile);
const mkdir      = util.promisify(fs.mkdir);

async function writeFile(name, content) {
    await mkdir(path.dirname(name), {recursive: true});
    await writeFile_(name, content);
}

/* -------------------------------------------------------------------------- *
 * Internationalization
 * -------------------------------------------------------------------------- */

const jspot   = require("jspot");
const po2json = util.promisify(require("po2json").parseFile);

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
    try {
        await Promise.all(files.map(f => exec(`msgmerge -U ${f} locales/messages.pot`)))
    }
    catch (e) {
        log.warn("Could not run msgmerge. Translation files not updated.")
    }
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
    await writeFile("build/electron/src/js/locales.js", content);
}

const translationsTask = series(jspotTask, msgmergeTask, po2jsonTask);

/* -------------------------------------------------------------------------- *
 * Application manifest and nodejs dependencies
 * -------------------------------------------------------------------------- */

const modclean = require("modclean");
const pkg      = require("./package.json");

async function packageJsonTask() {
    // Get version number from last commit date.
    const rev = (await exec('git show -s --format="%cI %ct"'))
                .stdout.toString().trim().split(" ");
    // Format Sozi version: YY.MM.DD-T (year.month.timestamp).
    const year   = rev[0].slice(2,  4);
    const month  = rev[0].slice(5,  7);
    const day    = rev[0].slice(8, 10);
    const tstamp = rev[1];
    pkg.version  = `${year}.${month}.${day}-${tstamp}`;
    // Remove dev dependencies from target package.json
    delete pkg.devDependencies;
    // Set application entry point.
    pkg.main = "src/js/index-electron.js";
    await writeFile("build/electron/package.json", JSON.stringify(pkg));
}

async function installDeps() {
    await exec("npm install --only=prod \
                             --no-audit \
                             --no-fund \
                             --no-optional \
                             --no-package-lock", {cwd: "build/electron"});
    await modclean({cwd: "build/electron/node_modules"}).clean();
}

const pkgTask = series(packageJsonTask, installDeps);

/* -------------------------------------------------------------------------- *
 * Transpile and collect the source files of the application
 * -------------------------------------------------------------------------- */

const babel      = require("gulp-babel");
const browserify = require("gulp-browserify");
const uglify     = require("gulp-uglify");
const nunjucks   = require("gulp-nunjucks");
const rename     = require("gulp-rename");

function makeTranspileTask(dir, opts) {
    return () => {
        return src("src/js/**/*.js")
            .pipe(babel({
                presets: [["@babel/preset-env", opts]]
            }))
            .pipe(dest(`build/${dir}/src/js/`));
    };
}

const electronTranspileTask = makeTranspileTask("electron", {targets: {node: "12"}});
const browserTranspileTask  = makeTranspileTask("browser",  {useBuiltIns: "usage", corejs: 3});

function browserifyTask() {
    return src(["build/browser/src/js/player.js", "build/browser/src/js/presenter.js"])
        .pipe(browserify())
        .pipe(uglify({
            mangle: true,
            compress: true
        }))
        .pipe(dest("build/tmp/"))
}

function makeTemplateTask(tpl) {
    return () => {
        return src(`src/templates/${tpl}.html`)
            .pipe(nunjucks.compile({js: fs.readFileSync(`build/tmp/${tpl}.js`)}))
            .pipe(dest("build/electron/src/templates/"));
    };
}

const templatesTask = parallel(
    makeTemplateTask("player"),
    makeTemplateTask("presenter")
);

function cssCopyTask() {
    return src("src/css/**/*.css")
        .pipe(dest("build/electron/src/css/"));
}

function makeRenameTask(fromPath, toName, toPath = ".") {
    return () => {
        return src(fromPath)
            .pipe(rename(toName))
            .pipe(dest(path.join(toPath, path.dirname(fromPath))));
    };
}

const electronIndexRenameTask        = makeRenameTask("src/index-electron.html", "index.html", "build/electron");
const electronBackendIndexRenameTask = makeRenameTask("build/electron/src/js/backend/index-electron.js", "index.js")

const transpileTask =
    parallel(
        cssCopyTask,
        electronIndexRenameTask,
        series(
            electronTranspileTask,
            electronBackendIndexRenameTask
        ),
        series(
            browserTranspileTask,
            browserifyTask,
            templatesTask
        )
    );

exports.default = parallel(translationsTask, pkgTask, transpileTask);

/* -------------------------------------------------------------------------- *
 * Documentation.
 * -------------------------------------------------------------------------- */

const jsdoc = require("gulp-jsdoc3");

function jsdocTask(cb) {
    const config = require("./config/jsdoc.json");
    src("./src/**/*.js", {read: false})
        .pipe(jsdoc(config, cb));
}

exports.jsdoc = jsdocTask;
