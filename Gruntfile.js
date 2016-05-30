module.exports = function(grunt) {
    "use strict";

    var path = require("path");
    var fs = require("fs");

    var nunjucks = require("nunjucks");
    nunjucks.configure({watch: false});

    require("load-grunt-tasks")(grunt);

    var pkg = grunt.file.readJSON("package.json");
    pkg.version = grunt.template.today("yy.mm.ddHHMM");

    var backends = {
        web: [
            "build/js/backend/FileReader.js",
            "build/js/backend/GoogleDrive.config.js"
        ],
        electron: [
            "build/js/backend/Electron.js"
        ]
    };

    var buildConfigJs = grunt.option("buildConfig") || "buildConfig.js";
    var buildConfig = {
        platforms: [
            "darwin", "linux", "mas", "win32"
        ],
        archs: [
            "ia32", "x64"
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
                    dest: "build"
                }]
            }
        },

        jspot: {
            options: {
                keyword: "_"
            },
            all: {
                // Exclude *.bundle.js and *.min.js
                src: ["build/js/**/*.js", "!build/js/*.*.js"],
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
                dest: "build/js/locales.js",
            }
        },

        browserify: {
            editor: {
                options: {
                    external: ["electron", "fs", "path", "process"]
                },
                src: [
                    "build/js/svg/*Handler.js",
                    "<%= nunjucks.player.dest %>",
                    "build/js/editor.js"
                ],
                dest: "build/js/editor.bundle.js"
            },
            player: {
                src: [
                    "build/js/player.js"
                ],
                dest: "build/js/player.bundle.js"
            }
        },

        /*
         * Compress the JavaScript code of the editor and player.
         */
        uglify: {
            options: buildConfig.uglifyOptions,
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/js/editor.min.js"
            },
            player: {
                src: "<%= browserify.player.dest %>",
                dest: "build/js/player.min.js"
            }
        },

        /*
         * Precompile templates for the editor and player.
         */
        nunjucks_render: {
            player: {
                src: "templates/player.html",
                dest: "build/templates/player.html",
                context: {
                    playerJs: "<%= grunt.file.read('build/js/player.min.js') %>"
                }
            }
        },

        nunjucks: {
            player: {
                src: ["<%= nunjucks_render.player.dest %>"],
                dest: "build/templates/player.templates.js"
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
                    },
                    {
                        src: "build/package.json",
                        dest: "build/app/package.json"
                    },
                    {
                        src: "build/js/electron.js",
                        dest: "build/app/electron.js"
                    },
                    {
                        src: "<%= uglify.editor.dest %>",
                        dest: "build/app/js/editor.min.js"
                    }
                ]
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
         * Build node-webkit applications for various platforms.
         * The options take precedence over the targets variable
         * defined later.
         */

        electron: {
            editor: {
                options: {
                    name: "Sozi",
                    dir: "build/app",
                    out: "dist",
                    overwrite: true,
                    version: buildConfig.electronVersion,
                    platform: buildConfig.platforms.join(","),
                    arch: buildConfig.archs.join(",")
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
                        include(fs.statSync("build/js/player.min.js").mtime > details.time);
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
        buildConfig.archs.forEach(function (arch) {
            var targetName = platform + "-" + arch;
            var destName = "Sozi-" + pkg.version + "-" + targetName;
            grunt.config(["rename", targetName], {
                src: "dist/Sozi-" + targetName,
                dest: "dist/" + destName
            });

            grunt.config(["compress", targetName], {
                options: {
                    mode: "tgz",
                    archive: "dist/" + destName + ".tgz"
                },
                expand: true,
                cwd: "dist/",
                src: [destName + "/**/*"]
            });
        });
    });
    
    grunt.registerTask("write_package_json", function () {
        grunt.file.write("build/package.json", JSON.stringify(pkg));
    });

    grunt.registerMultiTask("nunjucks_render", function () {
        this.files.forEach(function (file) {
            grunt.file.write(file.dest, nunjucks.render(file.src[0], this.data.context));
            grunt.log.writeln("File " + file.dest + " created.");
        }, this);
    });

    grunt.registerTask("backends-web", function () {
        // grunt.config.merge does not work for this
        grunt.config.set("browserify.editor.src",
            grunt.config.get("browserify.editor.src").concat(backends.web)
        );
    });

    grunt.registerTask("backends-electron", function () {
        // grunt.config.merge does not work for this
        grunt.config.set("browserify.editor.src",
            grunt.config.get("browserify.editor.src").concat(backends.electron)
        );
    });

    grunt.registerTask("lint", ["jshint", "csslint"]);

    grunt.registerTask("build", [
        "write_package_json",
        "newer:babel",
        "browserify:player", // Cannot use 'newer' here due to imports
        "newer:uglify:player",
        "newer:nunjucks_render",
        "newer:nunjucks",
        "newer:po2json",
        "browserify:editor", // Cannot use 'newer' here due to imports
        "newer:uglify:editor",
        "newer:copy:editor"
    ]);

    grunt.registerTask("electron-build",  ["backends-electron", "build"]);
    grunt.registerTask("web-build", ["backends-web", "build"]);

    grunt.registerTask("electron-bundle", [
        "electron-build",
        "electron",
        "rename",
        "compress"
    ]);

    grunt.registerTask("web-demo", [
        "web-build",
        "rsync" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    grunt.registerTask("pot", [
        "newer:babel",
        "jspot" // Cannot use 'newer' here since 'dest' is not a generated file
    ]);

    grunt.registerTask("default", ["electron-bundle", "compress"]);
};
