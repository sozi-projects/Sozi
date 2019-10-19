module.exports = function(grunt) {
    "use strict";

    var path = require("path");
    var fs = require("fs");
    var execSync = require("child_process").execSync;

    var nunjucks = require("nunjucks");
    nunjucks.configure({watch: false});

    require("load-grunt-tasks")(grunt);

    var pkg = grunt.file.readJSON("package.json");

    // Get version number from last commit date.
    // Format: YY.MM.T (year.month.timestamp).
    var rev = execSync("git show -s --format='%cI %ct'").toString().trim().split(" ");
    pkg.version = rev[0].slice(2, 4) + "." + rev[0].slice(5, 7) + "." + rev[0].slice(8, 10) + "-" + rev[1];

    var buildConfig = grunt.file.readJSON("config.default.json");
    var buildConfigJson = grunt.option("config");

    if (buildConfigJson) {
        try {
            var customBuildConfig = grunt.file.readJSON(buildConfigJson);

            grunt.verbose.writeln("Using configuration from " + buildConfigJson);

            // Overwrite default config
            for (var key in customBuildConfig) {
                buildConfig[key] = customBuildConfig[key];
            }
        }
        catch (noBuildConfigFound) {
            grunt.log.error("Configuration file " + buildConfigJson + " not found.");
        }
    }

    // Remove duplicates from an array.
    function dedup(arr) {
        return arr.filter(function (x, pos) {
            return arr.indexOf(x) === pos;
        });
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

        /*
         * Check JavaScript and CSS source files.
         */
        jshint: {
            options: {
                jshintrc: true
            },
            all: [ "js/**/*.js" ]
        },

        csslint: {
            options: {
                csslintrc: ".csslintrc"
            },
            all: [ "css/**/*.css" ]
        },

        /*
         * Automatic tests.
         */
        simplemocha: {
            options: {
                timeout: 3000,
                ignoreLeaks: false,
                ui: "bdd",
                reporter: "tap"
            },
            all: {
                src: ["test/**/*.mocha.js"]
            }
        },

        /*
         * Transpile JavaScript source files from ES6 to ES5
         */
        babel: {
            options: {
                presets: ["@babel/preset-env"]
            },
            all: {
                files: [{
                    expand: true,
                    src: ["js/**/*.js"],
                    dest: "build/app"
                }]
            }
        },

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

        po2json: {
            options: {
                fuzzy: false,
                singleFile: true,
                nodeJs: true,
                format: "jed1.x"
            },
            all: {
                src: ["locales/*.po"],
                dest: "build/app/js/locales.js",
            }
        },

        browserify: {
            editor: {
                options: {
                    external: ["electron", "fs", "process"],
                    browserifyOptions: {
                        basedir: "build/app"
                    }
                },
                src: ["build/app/js/editor.js"],
                dest: "build/tmp/js/editor.bundle.js"
            },
            player: {
                src: ["build/app/js/player.js"],
                dest: "build/tmp/js/player.bundle.js"
            }
        },

        /*
         * Compress the JavaScript code of the editor, player, and presenter.
         */
        uglify: {
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/app/js/editor.min.js"
            },
            player: {
                src: "<%= browserify.player.dest %>",
                dest: "build/tmp/js/player.min.js"
            },
            presenter: {
                src: "build/app/js/presenter.js",
                dest: "build/tmp/js/presenter.min.js"
            }
        },

        /*
         * Precompile templates for the editor and player.
         */
        nunjucks_render: {
            player: {
                src: "templates/player.html",
                dest: "build/app/templates/player.html",
                context: {
                    playerJs: "<%= grunt.file.read('build/tmp/js/player.min.js') %>"
                }
            },
            presenter: {
                src: "templates/presenter.html",
                dest: "build/app/templates/presenter.html",
                context: {
                    presenterJs: "<%= grunt.file.read('build/tmp/js/presenter.min.js') %>"
                }
            }
        },

        copy: {
            editor: {
                files: [
                    {
                        expand: true,
                        src: [
                            "index-*.html",
                            "css/**/*",
                            "vendor/**/*"
                        ],
                        dest: "build/app"
                    }
                ]
            }
        },

        rename: {
            webapp_backend: {
                src: ["build/app/js/backend/index-webapp.js"],
                dest: "build/app/js/backend/index.js"
            },
            webapp_html: {
                src: ["build/app/index-webapp.html"],
                dest: "build/app/index.html"
            },
            electron_backend: {
                src: ["build/app/js/backend/index-electron.js"],
                dest: "build/app/js/backend/index.js"
            },
            electron_html: {
                src: ["build/app/index-electron.html"],
                dest: "build/app/index.html"
            }
        },

        compress: {
            media: {
                options: {
                    mode: "zip",
                    archive: "dist/Sozi-extras-media-<%= pkg.version %>.zip"
                },
                expand: true,
                cwd: "extras/media",
                src: ["**/*"]
            }
        },

        /*
         * Build electron applications for various platforms.
         * The options take precedence over the targets variable
         * defined later.
         */

        "install-dependencies": {
            options: {
                cwd: "build/app"
            }
        },

        electron: {
            editor: {
                options: {
                    name: "Sozi",
                    dir: "build/app",
                    out: "dist",
                    overwrite: true,
                    prune: false,
                    electronVersion: buildConfig.electronVersion,
                    platform: dedup(buildConfig.platforms.map(getPlatformOS)).join(","),
                    arch:     dedup(buildConfig.platforms.map(getPlatformArch)).join(",")
                }
            }
        },

        /*
         * Upload the web demonstration of the Sozi editor.
         */
        rsync: {
            options: {
                args: ["--verbose", "--update", "--checksum"]
            },
            editor: {
                options: {
                    src: ["build/app/*"],
                    dest: "/var/www/sozi.baierouge.fr/demo/",
                    host: "sozi@baierouge.fr",
                    deleteAll: true,
                    recursive: true
                }
            }
        },

        newer: {
            options: {
                override: function (details, include) {
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

    /*
     * Generate installable bundles for each platform.
     */

    var debianArchs = {
        ia32: "i386",
        x64: "amd64"
    };

    var renamedOS = {
        darwin: "osx",
        win32: "windows"
    };

    buildConfig.platforms.forEach(function (platform) {
        // The folder for the current platform.
        var distDir = "dist/Sozi-" + platform;
        // Get the components of the platform.
        var platformOS   = getPlatformOS(platform);
        if (platformOS in renamedOS) {
            platformOS = renamedOS[platformOS];
        }
        var platformArch = getPlatformArch(platform);
        // The name of the target folder for the current platform in dist/.
        var bundleName = "Sozi-" + pkg.version + "-" + platformOS + "-" + platformArch;
        // The renamed folder for the current platform.
        var bundleDir = "dist/" + bundleName;

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
            src: bundleDir
        });

        // Rename the distribution folder to the bundle name.
        grunt.config(["rename", platform], {
            src: distDir,
            dest: bundleDir
        });

        // Build zip files for Windows, tgz for other platforms.
        var bundleFormat = platformOS.startsWith("win") ? "zip" : "tgz";

        grunt.config(["compress", platform], {
            options: {
                mode: bundleFormat,
                archive: bundleDir + "." + bundleFormat
            },
            expand: true,
            cwd: "dist/",
            src: [bundleName + "/**/*"]
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
    });

    grunt.registerTask("copy-installation-assets", buildConfig.platforms.reduce(function (prev, platform) {
        var installationTask = buildConfig.installable.indexOf(getPlatformOS(platform)) >= 0 ? ["copy:" + platform] : [];
        return prev.concat(installationTask);
    }, []));

    grunt.registerTask("rename-platforms", buildConfig.platforms.reduce(function (prev, platform) {
        return prev.concat(["clean:" + platform, "rename:" + platform]);
    }, []));

    grunt.registerTask("compress-platforms", buildConfig.platforms.reduce(function (prev, platform) {
        return prev.concat(["compress:" + platform]);
    }, []));

    grunt.registerTask("write_package_json", function () {
        grunt.file.write("build/app/package.json", JSON.stringify(pkg));
    });

    grunt.registerMultiTask("nunjucks_render", function () {
        this.files.forEach(function (file) {
            grunt.file.write(file.dest, nunjucks.render(file.src[0], this.data.context));
            grunt.log.writeln("File " + file.dest + " created.");
        }, this);
    });

    grunt.registerMultiTask("debian_package", function () {
        var workDir = "dist/packaging-" + this.data.platform;
        grunt.file.write(workDir + "/Makefile",  nunjucks.render("debian/Makefile", this.data));
        grunt.file.write(workDir + "/debian/changelog", nunjucks.render("debian/changelog", this.data));
        grunt.file.write(workDir + "/debian/compat", nunjucks.render("debian/compat", this.data));
        grunt.file.write(workDir + "/debian/control", nunjucks.render("debian/control", this.data));
        grunt.file.write(workDir + "/debian/links", nunjucks.render("debian/links", this.data));
        grunt.file.write(workDir + "/debian/rules", nunjucks.render("debian/rules", this.data));
        execSync("dpkg-buildpackage -a" + this.data.arch, {cwd: workDir});
    });

    grunt.registerTask("lint", ["jshint", "csslint"]);

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

    grunt.registerTask("electron-build",  [
        "build",
        "rename:electron_backend",
        "rename:electron_html",
        "install-dependencies",
        "electron",
        "copy-installation-assets"
    ]);

    grunt.registerTask("web-build", [
        "build",
        "rename:webapp_backend",
        "rename:webapp_html",
        "browserify:editor", // Cannot use 'newer' here due to imports
        "newer:uglify:editor"
    ]);

    grunt.registerTask("electron-bundle", [
        "electron-build",
        "rename-platforms",
        "compress-platforms"
    ]);

    grunt.registerTask("web-demo", [
        "web-build",
        "rsync" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    grunt.registerTask("pot", [
        "newer:babel",
        "jspot" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    if (buildConfig.platforms.some(p => getPlatformOS(p) === "linux")) {
        grunt.registerTask("deb", [
            "electron-build",
            "rename-platforms",
            "debian_package"
        ]);

        grunt.registerTask("dist", [
            "electron-bundle",
            "debian_package"
        ]);
    }
    else {
        grunt.registerTask("dist", ["electron-bundle"]);
    }

    grunt.registerTask("default", ["electron-bundle"]);
};
