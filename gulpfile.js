
const {src, dest, series, parallel} = require("gulp");
const newer      = require("gulp-newer");
const streamExec = require("gulp-exec");
const util       = require("util");
const path       = require("path");
const fs         = require("fs");
const {execSync} = require("child_process");
const exec       = util.promisify(require("child_process").exec);
const glob       = util.promisify(require("glob"));
const log        = require("fancy-log");
const writeFile_ = util.promisify(fs.writeFile);
const mkdir_     = util.promisify(fs.mkdir);
const rmdir_     = util.promisify(fs.rmdir);
const copyFile_  = util.promisify(fs.copyFile);
const renameFile = util.promisify(fs.rename);

function mkdir(path) {
    return mkdir_(path, {recursive: true});
}

function rmdir(path) {
    return rmdir_(path, {recursive: true});
}

async function writeFile(name, content) {
    await mkdir(path.dirname(name));
    await writeFile_(name, content);
}

async function copyFile(src, dest) {
    await mkdir(path.dirname(dest));
    await copyFile_(src, dest);
}

function makeCopyTask(fromPath, toPath) {
    return function copyTask() {
        return src(fromPath, {allowEmpty: true})
            .pipe(newer(toPath))
            .pipe(dest(toPath));
    }
}

function makeRenameTask(fromPath, toPath) {
    return function renameTask() {
        return src(fromPath, {allowEmpty: true})
            .pipe(newer(toPath))
            .pipe(rename(path.basename(toPath)))
            .pipe(dest(path.dirname(toPath)));
    };
}

function dummyTask(cb) {
    cb();
}

function toArray(stream) {
    return new Promise((resolve, reject) => {
        const res = [];
        stream.on("data", data => res.push(data));
        stream.on("end", err => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}

async function newerFiles(srcGlob, destPath) {
    const files = await toArray(src(srcGlob, {read: false}).pipe(newer(destPath)));
    return files.map(f => path.relative(process.cwd(), f.path));
}

/* -------------------------------------------------------------------------- *
 * Internationalization
 * -------------------------------------------------------------------------- */

const jspot   = require("jspot");
const po2json = util.promisify(require("po2json").parseFile);

async function jspotTask() {
    const files = await newerFiles("src/**/*.js", "locales/messages.pot");
    if (files.length) {
        jspot.extract({
            keyword: "_",
            parserOptions: {
                sourceType: "module",
                ecmaVersion: 9
            },
            source: files,
            target: "locales"
        });
    }
}

function msgmergeTask() {
    return src("locales/*.po", {read: false})
        .pipe(newer({dest: "locales", extra: "locales/messages.pot"}))
        .pipe(streamExec(file => `msgmerge -U ${file.path} locales/messages.pot`, {
            continueOnError: true
        }));
}

function makePo2JsonTask(target) {
    return async function po2jsonTask() {
        const destPath = `build/${target}/src/js/locales.js`;
        const files = await newerFiles("locales/*.po", destPath);
        if (files.length) {
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
            await writeFile(destPath, content);
        }
    };
}

const electronTranslationsTask = series(jspotTask, msgmergeTask, makePo2JsonTask("electron"));
const browserTranslationsTask  = series(jspotTask, msgmergeTask, makePo2JsonTask("browser"));

/* -------------------------------------------------------------------------- *
 * Application manifest and nodejs dependencies
 * -------------------------------------------------------------------------- */

const modclean = require("modclean");

function getSoziVersion() {
    // Get version number from last commit date.
    const rev = execSync('git show -s --format="%cI %ct"')
                    .toString().trim().split(" ");
    // Format Sozi version: YY.MM.DD-T (year.month.timestamp).
    const year   = rev[0].slice(2,  4);
    const month  = rev[0].slice(5,  7);
    const day    = rev[0].slice(8, 10);
    const tstamp = rev[1];
    return `${year}.${month}.${day}-${tstamp}`;
}

const soziVersion = getSoziVersion();

function makePackageJsonTask(target, opts = {}) {
    return async function packageJsonTask() {
        const pkg = {
            ...require("./package.json"),
            ...opts,
            version: soziVersion
        };
        delete pkg.devDependencies;
        delete pkg.optionalDependencies;
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
    const destPath = `build/${target}/src/js/`;
    return function transpileTask() {
        return src("src/js/**/*.js")
            .pipe(newer(destPath))
            .pipe(babel({
                presets: [["@babel/preset-env", opts]]
            }))
            .pipe(dest(destPath));
    };
}

const electronTranspileTask = makeTranspileTask("electron", {targets: {node: "12"}});
const browserTranspileTask  = makeTranspileTask("browser",  {useBuiltIns: "usage", corejs: 3});

function makeBrowserifyTask(name) {
    return function browserifyTask() {
        // TODO Use newer
        return browserify({
                entries: `build/browser/src/js/${name}.js`,
                debug: false,
            })
            .bundle()
            .pipe(source(`${name}.js`))
            .pipe(buffer())
            .pipe(uglify({
                mangle:   true,
                compress: true
            }))
            .pipe(dest("build/tmp/"));
    };
}

const playerBrowserifyTask = parallel(
    makeBrowserifyTask("player"),
    makeBrowserifyTask("presenter")
);

function browserEditorBrowserifyTask() {
    // TODO Use newer
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
    const jsPath   = `build/tmp/${tpl}.js`;
    const destPath = `build/${target}/src/templates/`;
    return function templateTask() {
        return src(`src/templates/${tpl}.html`)
            .pipe(newer({dest: destPath, extra: jsPath}))
            .pipe(nunjucks.compile({js: fs.readFileSync(jsPath)}))
            .pipe(dest(destPath));
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

const electronCssCopyTask = makeCopyTask("src/css/**/*.css", `build/electron/src/css/`);
const browserCssCopyTask  = makeCopyTask("src/css/**/*.css", `build/browser/src/css/`);

const electronIndexRenameTask        = makeRenameTask("src/index-electron.html",                          "build/electron/src/index.html");
const electronBackendIndexRenameTask = makeRenameTask("build/electron/src/js/backend/index-electron.js",  "build/electron/src/js/backend/index.js")
const electronExporterRenameTask     = makeRenameTask("build/electron/src/js/exporter/index-electron.js", "build/electron/src/js/exporter/index.js")

const browserIndexRenameTask        = makeRenameTask("src/index-browser.html",                         "build/browser/index.html");
const browserBackendIndexRenameTask = makeRenameTask("build/browser/src/js/backend/index-browser.js",  "build/browser/src/js/backend/index.js")
const browserExporterRenameTask     = makeRenameTask("build/browser/src/js/exporter/index-browser.js", "build/browser/src/js/exporter/index.js")

const browserFaviconCopyTask = makeCopyTask("resources/icons/favicon.ico", "build/browser");

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

const distDir = "build/dist";

const builder = require("electron-builder");

const builderOpts = {
    appId: "fr.baierouge.sozi",
    productName: "Sozi",
    directories: {
        app: "build/electron",
        output: distDir
    },
    files: ["**/*"],
    linux: {
        target: ["AppImage", "rpm", "deb", "pacman"],
        icon: "resources/icons/256x256.png",
        category: "Graphics;Office",
        mimeTypes: ["image/svg+xml"]
    },
    deb: {
        fpm: ["--deb-recommends=ffmpeg", "--deb-suggests=inkscape"]
    },
    rpm: {
        fpm: ["--rpm-rpmbuild-define=_build_id_links none"]
    },
    win: {
        target: "nsis",
        icon: "resources/icons/sozi.ico",
        signAndEditExecutable: true
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true
    },
    mac: {
        // Compression to tar.xz is performed in task electronMacOSCompressTask:
        // * DMG and pkg targets are not available when building in Linux.
        // * tar.xz target does not preserve symbolic links.
        // * zip target is fast but very inefficient.
        // * dir target does not execute afterPack hook.
        target: "zip",
        icon: "resources/icons/sozi.icns",
        category: "public.app-category.graphics-design"
    },
    afterPack(context) {
        return Promise.all(context.targets.map(target => {
            const platform = context.electronPlatformName;

            // In linux targets, electron-builder sets icon size to 0.
            // See issue https://github.com/electron-userland/electron-builder/issues/5294
            // Fix based on https://github.com/alephium/alephium-wallet/pull/41
            if (platform === "linux") {
                target.helper.iconPromise.value = target.helper.iconPromise.value.then(
                    icons => icons.map(
                        icon => ({...icon, size: icon.size === 0 ? 256 : icon.size})
                    )
                );
            }

            // Copy FFMPEG to the current packaged application.
            const arch       = builder.Arch[context.arch];
            const ffmpegBin  = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
            const ffmpegSrc  = `resources/ffmpeg/${platform}-${arch}/${ffmpegBin}`;
            const ffmpegDest = platform === "darwin" ?
                `${context.appOutDir}/Sozi.app/Contents/Resources/${ffmpegBin}` :
                `${context.appOutDir}/resources/${ffmpegBin}`;
            return fs.existsSync(ffmpegSrc) ? copyFile(ffmpegSrc, ffmpegDest) : false;
        }));
    }
};

function electronLinuxPackageTask() {
    return builder.build({
        targets: builder.Platform.LINUX.createTarget(),
        config: builderOpts
    });
}

function electronWindowsPackageTask() {
    return builder.build({
        targets: builder.Platform.WINDOWS.createTarget(),
        config: builderOpts
    });
}

function electronMacOSPackageTask() {
    return builder.build({
        targets: builder.Platform.MAC.createTarget(),
        config: builderOpts
    });
}

function electronMacOSCompressTask() {
    return exec(`tar cJf ../Sozi-${soziVersion}-mac.tar.xz Sozi.app`, {cwd: `${distDir}/mac`, stdio: "ignore"});
}

const electronDistTask = series(
    electronBuildTask,
    parallel(
        electronLinuxPackageTask,
        electronWindowsPackageTask,
        series(electronMacOSPackageTask, electronMacOSCompressTask)
    )
);

exports.package = series(electronMacOSPackageTask, electronMacOSCompressTask); //electronDistTask;

/* -------------------------------------------------------------------------- *
 * Package the desktop application.
 * -------------------------------------------------------------------------- */

function makeZipTask(fromPath, toPath) {
    const opts = {
        cwd: path.dirname(fromPath),
        stdio: "ignore"
    };
    const src  = path.basename(fromPath);
    const dest = path.relative(opts.cwd, toPath);
    return async function zipTask() {
        await mkdir(distDir)
        await exec(`zip -ry ${dest} ${src}`, opts);
    }
}

const extrasMediaCompressTask =parallel(
    makeZipTask("extras/media-inkscape-0.92", `${distDir}/sozi-extras-media-${soziVersion}-inkscape-0.92.zip`),
    makeZipTask("extras/media-inkscape-1.0",  `${distDir}/sozi-extras-media-${soziVersion}-inkscape-1.0.zip`)
)

exports.extras = extrasMediaCompressTask;

exports.all = parallel(
    electronDistTask,
    extrasMediaCompressTask
);

/* -------------------------------------------------------------------------- *
 * Documentation.
 * -------------------------------------------------------------------------- */

const jsdoc = require("gulp-jsdoc3");

function jsdocTask(cb) {
    const config = require("./config/jsdoc.json");
    return src("./src/**/*.js", {read: false})
        .pipe(jsdoc(config, cb));
}

exports.jsdoc = jsdocTask;
