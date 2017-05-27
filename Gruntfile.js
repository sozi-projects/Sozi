module.exports = function(grunt) {
    "use strict";

    var path = require("path");
    var fs = require("fs");

    var nunjucks = require("nunjucks");
    nunjucks.configure({watch: false});

    require("load-grunt-tasks")(grunt);

    var pkg = grunt.file.readJSON("package.json");
    pkg.version = grunt.template.today("yy.mm.ddHHMM");

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

    grunt.verbose.write("Checking for bower_components...");
    if (grunt.file.isDir("bower_components")) {
        grunt.verbose.ok();
    }
    else {
        grunt.log.error("bower_components not found! Please run `bower install`.");
        process.exit();
    }

    function dedup(arr) {
        return arr.filter(function (x, pos) {
            return arr.indexOf(x) === pos;
        });
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
                presets: ["es2015"]
            },
            all: {
                files: [{
                    expand: true,
                    src: ["index-webapp.js", "js/**/*.js"],
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
                src: ["build/app/index-webapp.js"],
                dest: "build/tmp/js/editor.bundle.js"
            },
            player: {
                src: ["build/app/js/player.js"],
                dest: "build/tmp/js/player.bundle.js"
            }
        },

        /*
         * Compress the JavaScript code of the editor and player.
         */
        uglify: {
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/app/js/editor.min.js"
            },
            player: {
                src: "<%= browserify.player.dest %>",
                dest: "build/tmp/js/player.min.js"
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
                            "vendor/**/*",
                            "bower_components/**/*"
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
                    archive: "build/Sozi-extras-media-<%= pkg.version %>.zip"
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
                    electronVersion: buildConfig.electronVersion,
                    platform: dedup(buildConfig.platforms.map(p => p.split("-")[0])).join(","),
                    arch:     dedup(buildConfig.platforms.map(p => p.split("-")[1])).join(",")
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
                    host: "www-data@baierouge.fr",
                    deleteAll: true,
                    recursive: true
                }
            }
        },

        newer: {
            options: {
                override: function (details, include) {
                    if (details.task === "nunjucks_render" && details.target === "player") {
                        include(fs.statSync("build/tmp/js/player.min.js").mtime > details.time);
                    }
                    else {
                        include(false);
                    }
                }
            }
        }
    });

    /*
     * Compress electron bundles for each platform
     */
    buildConfig.platforms.forEach(function (platform) {
        var platformOs = platform.split("-")[0];
        grunt.config(["copy", platform], {
            "files": [{
                expand: true,
                flatten: true,
                src: "installation-assets/" + platformOs + "/*",
                dest: "dist/Sozi-" + platform + "/install/"
            }, {
                src: "icons/icon-256.png",
                dest: "dist/Sozi-" + platform + "/install/sozi.png"
            }],
            "options": {
                mode: true
            }
        });

        var destName = "Sozi-" + pkg.version + "-" + platform;
        grunt.config(["rename", platform], {
            src: "dist/Sozi-" + platform,
            dest: "dist/" + destName
        });

        var mode = platform.startsWith("win") ? "zip" : "tgz";

        grunt.config(["compress", platform], {
            options: {
                mode: mode,
                archive: "dist/" + destName + "." + mode
            },
            expand: true,
            cwd: "dist/",
            src: [destName + "/**/*"]
        });
    });

    grunt.registerTask("copy-installation-assets", buildConfig.platforms.reduce(function (prev, platform) {
        var platformOs = platform.split("-")[0];
        var installationTask = buildConfig.installable.includes(platformOs) ? ["copy:" + platform] : [];
        return prev.concat(installationTask);
    }, []));

    grunt.registerTask("electron-platforms", buildConfig.platforms.reduce(function (prev, platform) {
        return prev.concat(["rename:" + platform, "compress:" + platform]);
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

    grunt.registerTask("lint", ["jshint", "csslint"]);

    grunt.registerTask("build", [
        "write_package_json",
        "newer:babel",
        "browserify:player", // Cannot use 'newer' here due to imports
        "newer:uglify:player",
        "newer:nunjucks_render",
        "newer:po2json",
        "newer:copy:editor"
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
        "electron-platforms"
    ]);

    grunt.registerTask("web-demo", [
        "web-build",
        "rsync" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    grunt.registerTask("pot", [
        "newer:babel",
        "jspot" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    grunt.registerTask("default", ["electron-bundle"]);
};
