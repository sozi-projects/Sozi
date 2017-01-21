module.exports = function(grunt) {
    "use strict";

    var path = require("path");
    var fs = require("fs");

    var nunjucks = require("nunjucks");
    nunjucks.configure({watch: false});

    require("load-grunt-tasks")(grunt);

    var pkg = grunt.file.readJSON("package.json");
    pkg.version = grunt.template.today("yy.mm.ddHHMM");

    var buildConfigJs = grunt.option("buildConfig") || "buildConfig.js";
    var buildConfig = {
        platforms: [
            "darwin-x64",
            "linux-x64",
            "linux-ia32",
            "win32-x64",
            "win32-ia32"
        ],
        electronVersion: "1.2.0",
        uglifyOptions:{}
    };
    try {
        var customBuildConfig = require(path.resolve(buildConfigJs));
        grunt.verbose.writeln("Using configuration from " + buildConfigJs);
        for (var key in customBuildConfig) {
            buildConfig[key] = customBuildConfig[key];
        }
    }
    catch (noBuildConfigFound) {
        grunt.verbose.writeln("Configuration file " + buildConfigJs + " not found - using the default configuration.");
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
                whitelist: [
                    "es6.arrowFunctions",
                    "es6.properties.shorthand",
                    "es6.modules",
                    "es6.templateLiterals",
                    "es6.destructuring"
                ]
            },
            all: {
                files: [{
                    expand: true,
                    src: "js/**/*.js",
                    dest: "build/app"
                }]
            }
        },

        jspot: {
            options: {
                keyword: "_"
            },
            all: {
                src: ["build/app/js/**/*.js"],
                dest: "locales"
            }
        },

        po2json: {
            options: {
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
                    external: ["electron", "fs", "path", "process"]
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
         * Compress the JavaScript code of the editor and player.
         */
        uglify: {
            options: buildConfig.uglifyOptions,
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/webapp/js/editor.min.js"
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

        // OBSOLETE Not used in electron app
        nunjucks: {
            options: {
                name: function (filepath) {
                    return path.basename(filepath);
                }
            },
            player: {
                src: ["<%= nunjucks_render.player.dest %>"],
                dest: "build/app/js/templates/player.js"
            }
        },

        copy: {
            editor: {
                files: [
                    {
                        expand: true,
                        src: [
                            "index.html",
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
            webapp: {
                src: ["build/app/js/backend/index-webapp.js"],
                dest: "build/app/js/backend/index.js"
            },
            electron: {
                src: ["build/app/js/backend/index-electron.js"],
                dest: "build/app/js/backend/index.js"
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
                    version: buildConfig.electronVersion,
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
                args: ["--verbose", "--update"]
            },
            editor: {
                options: {
                    src: ["build/app/*"],
                    dest: "/var/www/sozi.baierouge.fr/demo/",
                    host: "www-data@baierouge.fr",
                    syncDest: true, // Delete files on destination
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
        "rename:electron",
        "install-dependencies",
        "electron"
    ]);

    grunt.registerTask("web-build", [
        "build",
        "rename:webapp",
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
