
const {src, dest, series, parallel} = require("gulp");
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
            .pipe(dest(toPath));
    }
}

function makeRenameTask(fromPath, toPath) {
    return function renameTask() {
        return src(fromPath, {allowEmpty: true})
            .pipe(rename(path.basename(toPath)))
            .pipe(dest(path.dirname(toPath)));
    };
}

function dummyTask(cb) {
    cb();
}

/* -------------------------------------------------------------------------- *
 * Internationalization
 * -------------------------------------------------------------------------- */

const jspot   = require("jspot");
const po2json = util.promisify(require("po2json").parseFile);

async function jspotTask() {
    const files = await glob("src/**/*.js");
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

const packager = require("electron-packager");

const soziConfigName = "SOZI_CONFIG" in process.env ? process.env.SOZI_CONFIG : "sozi-default";
const soziConfig = require(`./config/${soziConfigName}.json`);

const packagingDir = "build/packaging";
const distDir      = "build/dist";

const platformRename = {
    linux: "linux",
    darwin: "osx",
    win32: "windows"
};

const electronTargets = soziConfig.electronPackager.platform.map(platform =>
    soziConfig.electronPackager.arch.map(arch => ({
        platform,
        arch,
        epkgDir: `${packagingDir}/sozi-${platform}-${arch}`,
        dir: `${packagingDir}/sozi-${soziVersion}-${platformRename[platform]}-${arch}`
    }))).flat();

const packagerOpts = {
    dir: "build/electron",
    out: packagingDir,
    overwrite: true,
    ...soziConfig.electronPackager
};

function electronPackageTask() {
    return packager(packagerOpts);
}

function makeElectronPackageRenameTasks() {
    return parallel(...electronTargets
        .map(({epkgDir, dir}) => async function electronPackageRename() {
            // We don't use makeRenameTask here because we want to
            // rename each folder in place.
            if (fs.existsSync(dir)) {
                await rmdir(dir);
            }
            if (fs.existsSync(epkgDir)) {
                await renameFile(epkgDir, dir);
            }
        })
    );
}

function makeElectronFixLicenseTasks() {
    return parallel(...electronTargets
        .map(({dir}) => series(
            makeRenameTask(`${dir}/LICENSE`, `${dir}/LICENSE.electron`),
            makeCopyTask("LICENSE", dir)
        ))
    );
}

function makeElectronFfmpegTasks() {
    return parallel(...electronTargets
        .map(({platform, arch, dir}) => makeCopyTask(
            `resources/ffmpeg/${platform}-${arch}/ffmpeg*`,
            platform === "darwin" ?
                `${dir}/sozi.app/Contents/Resources` :
                `${dir}/resources`
        ))
    );
}

function makeElectronInstallScriptsTasks() {
    return parallel(...electronTargets
        .map(({platform, dir}) => makeCopyTask(
            `resources/install/${platform}/*`,
            `${dir}/install/`
        ))
    );
}

const zipFormat = {
    linux: "tar.xz",
    darwin: "tar.xz",
    win32: "zip"
};

function makeElectronCompressTasks() {
    const opts = {
        cwd: packagingDir,
        stdio: "ignore"
    };
    return parallel(...electronTargets
        .map(({platform, arch, dir}) => async function electronCompressTask() {
            if (fs.existsSync(dir)) {
                const ext  = zipFormat[platform];
                const src  = path.relative(opts.cwd, dir);
                const dest = path.relative(opts.cwd, `${distDir}/${src}.${ext}`);
                await mkdir(distDir)
                switch (ext) {
                    case "tar.xz": await exec(`tar cJf ${dest} ${src}`, opts); break;
                    case "zip":    await exec(`zip -ry ${dest} ${src}`, opts); break;
                }
            }
        })
    );
}

const linuxPackageOpts = {
    dest: distDir,
    icon: "resources/icons/icon-256.png",
    mimeType: ["image/svg+xml"],
}

const electronLinuxBuild = electronTargets.some(({platform}) => platform === "linux");

const debian = electronLinuxBuild && require("electron-installer-debian");

const debianPackageOpts = {
    maintainer: "Guillaume Savaton <guillaume@baierouge.fr>",
    section: "graphics",
    categories: ["Office", "Graphics"],
    recommends: ["ffmpeg"],
    suggests: ["inkscape"],
    ...linuxPackageOpts
};

const debianArch = {
    ia32: "i386",
    x64: "amd64"
};

function makeElectronDebianTasks() {
    return electronLinuxBuild ? parallel(...electronTargets
        .filter(t => t.platform === "linux")
        .map(({arch, dir}) => function electronDebianTask () {
            return debian({
                src: dir,
                arch: debianArch[arch],
                ...debianPackageOpts
            });
        })
    ) : dummyTask;
}

const redhat = electronLinuxBuild && require("electron-installer-redhat");

const redhatPackageOpts = {
    platform: "linux",
    ...linuxPackageOpts
};

const redhatArch = {
    ia32: "i386",
    x64: "x86_64"
};

function makeElectronRedhatTasks() {
    return electronLinuxBuild ? parallel(...electronTargets
        .filter(t => t.platform === "linux")
        .map(({arch, dir}) => function electronRedhatTask () {
            return redhat({
                src: dir,
                arch: redhatArch[arch],
                ...redhatPackageOpts
            });
        })
    ) : dummyTask;
}

const electronDistTask = series(
    electronBuildTask,
    electronPackageTask,
    makeElectronPackageRenameTasks(),
    parallel(
        makeElectronFfmpegTasks(),
        makeElectronFixLicenseTasks(),
        makeElectronInstallScriptsTasks()
    ),
    parallel(
        makeElectronDebianTasks(),
        makeElectronRedhatTasks(),
        makeElectronCompressTasks()
    )
);

exports.package = electronDistTask;

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
