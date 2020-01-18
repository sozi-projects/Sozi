module.exports = function(grunt) {
    "use strict";

    const path = require("path");
    const fs = require("fs");
    const execSync = require("child_process").execSync;
    const envify = require("envify/custom");

    const nunjucks = require("nunjucks");
    nunjucks.configure({watch: false});

    require("load-grunt-tasks")(grunt);

    const pkg = grunt.file.readJSON("package.json");

    // Get version number from last commit date.
    // Format: YY.MM.T (year.month.timestamp).
    const rev = execSync("git show -s --format='%cI %ct'").toString().trim().split(" ");
    pkg.version = rev[0].slice(2, 4) + "." + rev[0].slice(5, 7) + "." + rev[0].slice(8, 10) + "-" + rev[1];

    const buildConfig = grunt.file.readJSON("config.default.json");
    const buildConfigJson = grunt.option("config");

    if (buildConfigJson) {
        try {
            const customBuildConfig = grunt.file.readJSON(buildConfigJson);

            grunt.verbose.writeln("Using configuration from " + buildConfigJson);

            // Overwrite default config
            for (let key in customBuildConfig) {
                buildConfig[key] = customBuildConfig[key];
            }
        }
        catch (noBuildConfigFound) {
            grunt.log.error("Configuration file " + buildConfigJson + " not found.");
        }
    }

    // Remove duplicates from an array.
    function dedup(arr) {
        return Array.from(new Set(arr));
    }

    // Get the OS part from a platform identifier.
    function getPlatformOS(platform) {
        return platform.split("-")[0];
    }

    // Get the architecture part from a platform identifier.
    function getPlatformArch(platform) {
        return platform.split("-")[1];
    }

    grunt.initConfig({
        pkg: pkg,

        // Check JavaScript source files.
        jshint: {
            options: {
                jshintrc: true
            },
            all: [ "js/**/*.js" ]
        },

        // Check CSS source files.
        csslint: {
            options: {
                csslintrc: ".csslintrc"
            },
            all: [ "css/**/*.css" ]
        },

        // Generate JavaScript API documentation.
        jsdoc: {
            options: {
                destination: "dist/api",
                configure: "jsdoc.json"
            },
            all: [ "js/**/*.js" ]
        },

        // Transpile JavaScript source files for Electron and browsers.
        babel: {
            electron: {
                options: {
                    presets: [["@babel/preset-env", {targets: {node: "12"}}]]
                },
                files: [{
                    expand: true,
                    src: ["js/**/*.js"],
                    dest: "build/electron"
                }]
            },
            browser: {
                options: {
                    presets: [["@babel/preset-env", {useBuiltIns: "usage", corejs: 3}]]
                },
                files: [{
                    expand: true,
                    src: ["js/**/*.js"],
                    dest: "build/browser"
                }]
            }
        },

        // Generate gettext translation template (pot) file from JavaScript sources.
        jspot: {
            options: {
                keyword: "_",
                parserOptions: {
                    sourceType: "module"
                }
            },
            all: {
                src: ["js/**/*.js"],
                dest: "locales"
            }
        },

        // Convert gettext translation (po) files to JavaScript.
        po2json: {
            options: {
                fuzzy: false,
                singleFile: true,
                nodeJs: true,
                format: "jed1.x"
            },
            electron: {
                src: ["locales/*.po"],
                dest: "build/electron/js/locales.js",
            },
            browser: {
                src: ["locales/*.po"],
                dest: "build/browser/js/locales.js",
            }
        },

        // Merge JavaScript modules for browser targets.
        browserify: {
            editor: {
                options: {
                    external: ["electron", "fs", "process"],
                    browserifyOptions: {
                        basedir: "build/browser"
                    },
                    configure(b) {
                        b.transform({global: true}, envify({NODE_ENV: "production"}));
                    }
                },
                src: ["build/browser/js/editor.js"],
                dest: "build/tmp/js/editor.js"
            },
            player: {
                src: ["build/browser/js/player.js"],
                dest: "build/tmp/js/player.js"
            }
        },

        // Compress the JavaScript code of the editor, player, and presenter
        // for browser targets.
        uglify: {
            options: {
                mangle: false,
                compress: false
            },
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/browser/js/editor.min.js"
            },
            player: {
                src: "<%= browserify.player.dest %>",
                dest: "build/tmp/js/player.min.js"
            },
            presenter: {
                src: "build/browser/js/presenter.js",
                dest: "build/tmp/js/presenter.min.js"
            }
        },

        // Precompile templates for the player and presenter,
        // inserting the player and presenter JavaScript into the template HTML.
        nunjucks_render: {
            player: {
                src: "templates/player.html",
                dest: "build/browser/templates/player.html",
                context: {
                    js: "<%= uglify.player.dest %>"
                }
            },
            presenter: {
                src: "templates/presenter.html",
                dest: "build/browser/templates/presenter.html",
                context: {
                    js: "<%= uglify.presenter.dest %>"
                }
            }
        },

        // Copy assets to the build/ folder.
        copy: {
            editor: {
                files: [
                    {
                        expand: true,
                        src: [
                            "index-electron.html",
                            "css/**/*",
                            "vendor/**/*"
                        ],
                        dest: "build/electron/"
                    },
                    {
                        expand: true,
                        src: [
                            "index-webapp.html",
                            "css/**/*",
                            "vendor/**/*"
                        ],
                        dest: "build/browser/"
                    },
                    {
                        expand: true,
                        flatten: true,
                        src: [
                            "<%= nunjucks_render.player.dest %>",
                            "<%= nunjucks_render.presenter.dest %>"
                        ],
                        dest: "build/electron/templates/"
                    }
                ]
            }
        },

        // Rename index HTML and JavaScript files depending on the target.
        rename: {
            webapp_backend: {
                src: ["build/browser/js/backend/index-webapp.js"],
                dest: "build/browser/js/backend/index.js"
            },
            webapp_html: {
                src: ["build/browser/index-webapp.html"],
                dest: "build/browser/index.html"
            },
            electron_backend: {
                src: ["build/electron/js/backend/index-electron.js"],
                dest: "build/electron/js/backend/index.js"
            },
            electron_html: {
                src: ["build/electron/index-electron.html"],
                dest: "build/electron/index.html"
            }
        },

        // Generate a zip archive of the "add media" Inkscape extension.
        compress: {
            media: {
                options: {
                    archive: "dist/Sozi-extras-media-<%= pkg.version %>.zip",
                    cwd: "extras/media"
                },
                src: [
                    "extras/media/sozi_extras_media.inx",
                    "extras/media/sozi_extras_media.py"
                ]
            }
        },

        // Install all node modules used by the editor into the build/ folder.
        "install-dependencies": {
            electron: {
                options: {
                    cwd: "build/electron"
                }
            },
            browser: {
                options: {
                    cwd: "build/browser"
                }
            }
        },

        // Build the Electron application.
        electron: {
            editor: {
                options: {
                    name: "Sozi",
                    dir: "build/electron",
                    out: "dist",
                    overwrite: true,
                    prune: false,
                    electronVersion: buildConfig.electronVersion,
                    platform: dedup(buildConfig.platforms.map(getPlatformOS)).join(","),
                    arch:     dedup(buildConfig.platforms.map(getPlatformArch)).join(",")
                }
            }
        },

        // Upload the web demonstration of the editor.
        rsync: {
            options: {
                args: ["--verbose", "--update", "--checksum"]
            },
            editor: {
                options: {
                    src: ["build/browser/*"],
                    dest: "/var/www/sozi.baierouge.fr/demo/",
                    host: "sozi@baierouge.fr",
                    deleteAll: true,
                    recursive: true
                }
            },
            api: {
                options: {
                    src: ["dist/api"],
                    dest: "/var/www/sozi.baierouge.fr/",
                    host: "sozi@baierouge.fr",
                    deleteAll: true,
                    recursive: true
                }
            }
        },

        newer: {
            options: {
                override(details, include) {
                    if (details.task === "nunjucks_render") {
                        include(fs.statSync(`build/tmp/js/${details.target}.min.js`).mtime > details.time);
                    }
                    else {
                        include(false);
                    }
                }
            }
        }
    });

    // Conversion rules between Electron and Debian architecture names.
    const debianArchs = {
        ia32: "i386",
        x64: "amd64"
    };

    // Conversion rules between Electron and Debian OS names.
    const renamedOS = {
        darwin: "osx",
        win32: "windows"
    };

    // Generate an installable archive in the dist/ folder for each platform.
    for (let platform of buildConfig.platforms) {
        // The folder for the current platform.
        const distDir = "dist/Sozi-" + platform;
        // Extract the components of the platform name.
        let platformOS   = getPlatformOS(platform);
        if (platformOS in renamedOS) {
            platformOS = renamedOS[platformOS];
        }
        const platformArch = getPlatformArch(platform);
        // The name of the target folder for the current platform in dist/.
        const archiveName = "Sozi-" + pkg.version + "-" + platformOS + "-" + platformArch;
        // The renamed folder for the current platform.
        const archiveDir = "dist/" + archiveName;

        // Copy the installation assets for the target OS.
        grunt.config(["copy", platform], {
            options: {
                mode: true
            },
            files: [
                {
                    expand: true,
                    flatten: true,
                    src: "installation-assets/" + platformOS + "/*",
                    dest: distDir + "/install/"
                },
                {
                    src: "icons/icon-256.png",
                    dest: distDir + "/install/sozi.png"
                }
            ]
        });

        // Delete the distribution folder for this platform if it exists.
        grunt.config(["clean", platform], {
            src: archiveDir
        });

        // Rename the distribution folder to the archive name.
        grunt.config(["rename", platform], {
            src: distDir,
            dest: archiveDir
        });

        // Build zip files for Windows, tar.xz for other platforms.
        const archiveFormat = platformOS.startsWith("win") ? "zip" : "tar.xz";

        grunt.config(["compress", platform], {
            options: {
                archive: archiveDir + "." + archiveFormat,
                cwd: "dist/"
            },
            src: [archiveDir]
        });

        // Generate a Debian package for each Linux platform.
        if (platformOS === "linux" && platformArch in debianArchs) {
            grunt.config(["debian_package", platform], {
                version: pkg.version,
                platform: platform,
                arch: debianArchs[platformArch],
                date: new Date().toUTCString().slice(0, -3) + "+0000"
            });
        }
    }

    // Copy the installation scripts for each supported platform.
    grunt.registerTask("copy-installation-assets", buildConfig.platforms.flatMap(platform => {
        return buildConfig.installable.indexOf(getPlatformOS(platform)) >= 0 ? ["copy:" + platform] : [];
    }));

    // Rename the dist folder of each platform to match archive names.
    grunt.registerTask("rename-platforms", buildConfig.platforms.flatMap(platform => {
        return ["clean:" + platform, "rename:" + platform];
    }));

    // Generate a zip archive from a set of files.
    grunt.registerMultiTask("compress", function () {
        const dest = this.options().archive;
        const cwd = this.options().cwd;
        const src = this.files.map(f => f.src).flat().map(p => path.relative(cwd, p)).join(" ");

        grunt.log.writeln("Compressing " + dest);
        if (dest.endsWith(".tar.xz")) {
            execSync("tar cJf "+ path.relative(cwd, dest) + " " + src, {cwd});
        }
        else if (dest.endsWith(".zip")) {
            execSync("zip -ry " + path.relative(cwd, dest) + " " + src, {cwd});
        }
    });

    // Generate a zip archive for each platform.
    grunt.registerTask("compress-platforms", buildConfig.platforms.map(platform => "compress:" + platform));

    // Copy the package.json file with updated version number into the build/ folder.
    grunt.registerTask("write_package_json", function () {
        grunt.file.write("build/electron/package.json", JSON.stringify(pkg));
        grunt.file.write("build/browser/package.json", JSON.stringify(pkg));
    });

    // Render a template.
    grunt.registerMultiTask("nunjucks_render", function () {
        for (let file of this.files) {
            grunt.file.write(file.dest, nunjucks.render(file.src[0], {
                js: grunt.file.read(this.data.context.js)
            }));
            grunt.log.writeln("File " + file.dest + " created.");
        }
    });

    // Build a Debian package.
    grunt.registerMultiTask("debian_package", function () {
        const workDir = "dist/packaging-" + this.data.platform;
        grunt.file.write(workDir + "/Makefile",  nunjucks.render("debian/Makefile", this.data));
        grunt.file.write(workDir + "/debian/changelog", nunjucks.render("debian/changelog", this.data));
        grunt.file.write(workDir + "/debian/compat", nunjucks.render("debian/compat", this.data));
        grunt.file.write(workDir + "/debian/control", nunjucks.render("debian/control", this.data));
        grunt.file.write(workDir + "/debian/links", nunjucks.render("debian/links", this.data));
        grunt.file.write(workDir + "/debian/rules", nunjucks.render("debian/rules", this.data));
        execSync("dpkg-buildpackage -a" + this.data.arch, {cwd: workDir});
    });

    // Check JavaScript and CSS source files.
    grunt.registerTask("lint", ["jshint", "csslint"]);

    // Common build task for browser and Electron targets.
    grunt.registerTask("build", [
        "write_package_json",
        "newer:babel",
        "browserify:player", // Cannot use 'newer' here due to imports
        "newer:uglify:player",
        "newer:uglify:presenter",
        "newer:nunjucks_render",
        "newer:po2json",
        "newer:copy:editor",
        "compress:media"
    ]);

    // Build the Electron application.
    grunt.registerTask("electron-build",  [
        "build",
        "rename:electron_backend",
        "rename:electron_html",
        "install-dependencies",
        "electron",
        "copy-installation-assets"
    ]);

    // Build the editor for the browser.
    grunt.registerTask("web-build", [
        "build",
        "rename:webapp_backend",
        "rename:webapp_html",
        "browserify:editor", // Cannot use 'newer' here due to imports
        "newer:uglify:editor"
    ]);

    // Build an installable zip archive of the Electron application for all platform.
    grunt.registerTask("electron-archive", [
        "electron-build",
        "rename-platforms",
        "compress-platforms"
    ]);

    // Build and upload the editor for the browser.
    grunt.registerTask("web-demo", [
        "web-build",
        "rsync:editor" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    // Generate a translation template (pot) file.
    grunt.registerTask("pot", [
        "newer:babel",
        "jspot" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    // Build the Electron application, and generate zip archives and Debian packages if applicable.
    if (buildConfig.platforms.some(p => getPlatformOS(p) === "linux")) {
        grunt.registerTask("deb", [
            "electron-build",
            "rename-platforms",
            "debian_package"
        ]);

        grunt.registerTask("dist", [
            "electron-archive",
            "debian_package"
        ]);
    }
    else {
        grunt.registerTask("dist", ["electron-archive"]);
    }

    grunt.registerTask("api", ["jsdoc", "rsync:api"]);

    // Default task: build the Electron application, and generate zip archives
    grunt.registerTask("default", ["electron-archive"]);
};
