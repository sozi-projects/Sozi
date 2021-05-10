
const {src, dest, series, parallel} = require("gulp");
const util      = require("util");
const path      = require("path");
const fs        = require("fs");
const exec      = util.promisify(require("child_process").exec);
const glob      = util.promisify(require("glob"));
const log       = require("fancy-log");
const writeFile_ = util.promisify(fs.writeFile);
const mkdir      = util.promisify(fs.mkdir);
const copyFile   = util.promisify(fs.copyFile);

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

function makePo2JsonTask(target) {
    return async function po2jsonTask() {
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
        // Write the result to the app folders.
        await writeFile(`build/${target}/src/js/locales.js`, content);
    };
}

const electronTranslationsTask = series(jspotTask, msgmergeTask, makePo2JsonTask("electron"));
const browserTranslationsTask  = series(jspotTask, msgmergeTask, makePo2JsonTask("browser"));

/* -------------------------------------------------------------------------- *
 * Application manifest and nodejs dependencies
 * -------------------------------------------------------------------------- */

const modclean = require("modclean");

async function getSoziVersion() {
    // Get version number from last commit date.
    const rev = (await exec('git show -s --format="%cI %ct"'))
                .stdout.toString().trim().split(" ");
    // Format Sozi version: YY.MM.DD-T (year.month.timestamp).
    const year   = rev[0].slice(2,  4);
    const month  = rev[0].slice(5,  7);
    const day    = rev[0].slice(8, 10);
    const tstamp = rev[1];
    return `${year}.${month}.${day}-${tstamp}`;
}

function makePackageJsonTask(target, opts = {}) {
    return async function packageJsonTask() {
        const pkg = Object.assign(require("./package.json"), opts);
        delete pkg.devDependencies;
        pkg.version = await getSoziVersion();
        await writeFile(`build/${target}/package.json`, JSON.stringify(pkg));
    };
}

function makeInstallDepsTask(target) {
    return async function installDepsTask() {
        await exec("npm install --only=prod \
                                --no-audit \
                                --no-fund \
                                --no-optional \
                                --no-package-lock", {cwd: `build/${target}`});
        await modclean({cwd: `build/${target}/node_modules`}).clean();
    };
}

const electronNodePackageTask = series(
    makePackageJsonTask("electron", {main: "src/js/index-electron.js"}),
    makeInstallDepsTask("electron")
);

const browserNodePackageTask = series(
    makePackageJsonTask("browser"),
    makeInstallDepsTask("browser")
);

/* -------------------------------------------------------------------------- *
 * Transpile and collect the source files of the application
 * -------------------------------------------------------------------------- */

const babel      = require("gulp-babel");
const browserify = require("browserify");
const uglify     = require("gulp-uglify");
const nunjucks   = require("gulp-nunjucks");
const rename     = require("gulp-rename");
const envify     = require("envify/custom");
const source     = require("vinyl-source-stream");
const buffer     = require("vinyl-buffer");

function makeTranspileTask(target, opts) {
    return function transpileTask() {
        return src("src/js/**/*.js")
            .pipe(babel({
                presets: [["@babel/preset-env", opts]]
            }))
            .pipe(dest(`build/${target}/src/js/`));
    };
}

const electronTranspileTask = makeTranspileTask("electron", {targets: {node: "12"}});
const browserTranspileTask  = makeTranspileTask("browser",  {useBuiltIns: "usage", corejs: 3});

function makeBrowserifyTask(name) {
    return function browserifyTask() {
        return browserify({
                entries: `build/browser/src/js/${name}.js`,
                debug: false,
            })
            .bundle()
            .pipe(source(`${name}.js`))
            .pipe(buffer())
            .pipe(uglify({
                mangle: true,
                compress: true
            }))
            .pipe(dest("build/tmp/"))
    };
}

const playerBrowserifyTask = parallel(
    makeBrowserifyTask("player"),
    makeBrowserifyTask("presenter")
);

function browserEditorBrowserifyTask() {
    return browserify({
            entries: "build/browser/src/js/editor.js",
            external: ["electron", "fs", "process", "officegen", "pdf-lib"],
            debug: false,
            transform: [[envify({_: "purge", NODE_ENV: "production"}), {global: true}]]
        })
        .bundle()
        .pipe(source("editor.min.js"))
        .pipe(buffer())
        .pipe(uglify({
            mangle: true,
            compress: true
        }))
        .pipe(dest("build/browser/src/js/"));
}

function makeTemplateTask(target, tpl) {
    return function templateTask() {
        return src(`src/templates/${tpl}.html`)
            .pipe(nunjucks.compile({js: fs.readFileSync(`build/tmp/${tpl}.js`)}))
            .pipe(dest(`build/${target}/src/templates/`));
    };
}

const electronTemplatesTask = parallel(
    makeTemplateTask("electron", "player"),
    makeTemplateTask("electron", "presenter")
);

const browserTemplatesTask = parallel(
    makeTemplateTask("browser", "player"),
    makeTemplateTask("browser", "presenter")
);

function makeCssCopyTask(target) {
    return function cssCopyTask() {
        return src("src/css/**/*.css")
            .pipe(dest(`build/${target}/src/css/`));
    };
}

const electronCssCopyTask = makeCssCopyTask("electron");
const browserCssCopyTask  = makeCssCopyTask("browser");

function makeRenameTask(fromPath, toPath) {
    return function renameTask() {
        return src(fromPath)
            .pipe(rename(path.basename(toPath)))
            .pipe(dest(path.dirname(toPath)));
    };
}

const electronIndexRenameTask        = makeRenameTask("src/index-electron.html",                          "build/electron/src/index.html");
const electronBackendIndexRenameTask = makeRenameTask("build/electron/src/js/backend/index-electron.js",  "build/electron/src/js/backend/index.js")
const electronExporterRenameTask     = makeRenameTask("build/electron/src/js/exporter/index-electron.js", "build/electron/src/js/exporter/index.js")

const browserIndexRenameTask        = makeRenameTask("src/index-browser.html",                         "build/browser/index.html");
const browserBackendIndexRenameTask = makeRenameTask("build/browser/src/js/backend/index-browser.js",  "build/browser/src/js/backend/index.js")
const browserExporterRenameTask     = makeRenameTask("build/browser/src/js/exporter/index-browser.js", "build/browser/src/js/exporter/index.js")

function browserFaviconCopyTask() {
    return src("resources/icons/favicon.ico")
        .pipe(dest("build/browser"));
}

const electronBuildTask =
    parallel(
        electronTranslationsTask,
        electronNodePackageTask,
        electronCssCopyTask,
        electronIndexRenameTask,
        series(
            electronTranspileTask,
            electronBackendIndexRenameTask,
            electronExporterRenameTask
        ),
        series(
            browserTranspileTask,
            playerBrowserifyTask,
            electronTemplatesTask
        )
    );

const browserBuildTask =
    parallel(
        browserTranslationsTask,
        browserNodePackageTask,
        browserCssCopyTask,
        browserFaviconCopyTask,
        browserIndexRenameTask,
        series(
            browserTranspileTask,
            parallel(
                series(
                    browserBackendIndexRenameTask,
                    browserExporterRenameTask,
                    browserEditorBrowserifyTask
                ),
                series(
                    playerBrowserifyTask,
                    browserTemplatesTask
                )
            ),
        )
    );

exports.browserBuild  = browserBuildTask;
exports.electronBuild = browserBuildTask;
exports.default       = electronBuildTask;

/* -------------------------------------------------------------------------- *
 * Package the desktop application.
 * -------------------------------------------------------------------------- */

const packager = require("electron-packager");
const debian   = require("electron-installer-debian");

const soziConfigName = "SOZI_CONFIG" in process.env ? process.env.SOZI_CONFIG : "sozi-default";
const soziConfig = require(`./config/${soziConfigName}.json`);

const electronTargets = soziConfig.electronPackager.platform.map(platform =>
    soziConfig.electronPackager.arch.map(arch => ({
        platform,
        arch,
        dir: `dist/sozi-${platform}-${arch}`
    }))).flat();

const packagerOpts = Object.assign({
    dir: "build/electron",
    out: "dist",
    overwrite: true
}, soziConfig.electronPackager);

function electronPackageTask() {
    return packager(packagerOpts);
}

function electronFixLicenseTask() {
    return Promise.all(electronTargets.map(async ({dir}) => {
        if (fs.existsSync(dir)) {
            const licensePath = `${dir}/LICENSE`;
            await copyFile(licensePath, licensePath + ".electron");
            await copyFile("LICENSE", licensePath);
        }
    }));
}

async function electronFfmpegTask() {
    const ffmpegFiles = await glob("resources/ffmpeg/**/ffmpeg*");
    await Promise.all(ffmpegFiles.map(src => {
        const base = path.basename(path.dirname(src));
        const pkgDir = `sozi-${base}`;
        const resDir = base.startsWith("darwin") ?
            "sozi.app/Contents/Resources" :
            "resources";
        const dest = path.join("dist", pkgDir, resDir, path.basename(src));
        return copyFile(src, dest);
    }));
}

function electronInstallScriptsTask() {
    return Promise.all(electronTargets.map(async ({platform, dir}) => {
        if (fs.existsSync(dir)) {
            // Create install folder in electron application folder.
            const dest = `${dir}/install`;
            await mkdir(dest);
            // Copy install files to install folder.
            const res = await glob(`resources/install/${platform}/*`);
            await Promise.all(res.map(src => copyFile(src, path.join(dest, path.basename(src)))));
        }
    }));
}

// TODO Check dependencies
const debianOpts = {
    maintainer: "Guillaume Savaton <guillaume@baierouge.fr>",
    dest: "dist/installers",
    icon: "resources/icons/icon-256.png",
    section: "graphics",
    categories: ["Office", "Graphics"],
    mimeType: ["image/svg+xml"],
    recommends: ["ffmpeg"],
    suggests: ["inkscape"]
};

const debianArch = {
    ia32: "i386",
    x64: "amd64"
};

function electronDebianTask() {
    return Promise.all(electronTargets.map(({platform, arch, dir}) => {
        return platform != "linux" ?
            Promise.resolve() :
            debian(Object.assign(debianOpts, {
                src: dir,
                arch: debianArch[arch]
            }));
    }));
}

exports.package = series(
    electronBuildTask,
    electronPackageTask,
    parallel(
        electronFfmpegTask,
        electronFixLicenseTask,
        electronInstallScriptsTask
    ),
    electronDebianTask
);

exports.installScripts = electronInstallScriptsTask;

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
