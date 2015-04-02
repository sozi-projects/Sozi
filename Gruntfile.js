module.exports = function(grunt) {
    "use strict";

    var nunjucks = require("nunjucks");

    require("load-grunt-tasks")(grunt);
    
    var version = grunt.template.today("yy.mm.ddHHMM");
    var pkg = grunt.file.readJSON("package.json");

    var backends = {
        web: [
            "build/js/backend/FileReader.js",
            "build/js/backend/GoogleDrive.config.js"
        ],
        nw: [
            "build/js/backend/NodeWebkit.js"
        ]
    };
    
    grunt.initConfig({
        pkg: pkg,

        /*
         * Update the version number in package.json
         * each time the project is rebuilt.
         */
        modify_json: {
            options: {
                fields: {
                    version: version
                }
            },
            all: [ "package.json" ]
        },

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
                    "es6.modules"
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

        browserify: {
            editor: {
                options: {
                    external: ["nw.gui", "fs", "path", "process"]
                },
                src: [
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
            options: {
//                compress: false,
//                mangle: false,
//                beautify: true
            },
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
                            "package.json",
                            "css/**/*",
                            "vendor/**/*",
                            "bower_components/**/*"
                        ],
                        dest: "build/app"
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
                    archive: "build/Sozi-extras-media-" + version + ".zip"
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
        nodewebkit: {
            options: {
                buildDir: "build",
                platforms: [
                    "win32", "osx32", "linux32",
                    "win64", "osx64", "linux64"
                ]
            },
            editor: ["build/app/**/*"]
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
    });

    /*
     * Compress options for target OS in nodewebkit task.
     */
    var targetConfig = {
        linux32: "tgz",
        linux64: "tgz",
        win32: "zip",
        win64: "zip",
        osx32: "zip",
        osx64: "zip"
    };

    /*
     * Compress enabled node-webkit applications
     * for various platforms.
     */
    for (var targetName in targetConfig) {
        if (grunt.config(["nodewebkit", "options", "platforms"]).indexOf(targetName) >= 0) {
            var prefix = "Sozi-" + version + "-" + targetName;

            grunt.config(["rename", targetName], {
                src: "build/Sozi/" + targetName,
                dest: "build/Sozi/" + prefix
            });

            grunt.config(["compress", targetName], {
                options: {
                    // TODO preserve permissions for Linux executables
                    mode: targetConfig[targetName],
                    archive: "build/" + prefix + "." + targetConfig[targetName]
                },
                expand: true,
                cwd: "build/Sozi/",
                src: [prefix + "/**/*"]
            });
        }
    }

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
    
    grunt.registerTask("backends-nw", function () {
        // grunt.config.merge does not work for this
        grunt.config.set("browserify.editor.src",
            grunt.config.get("browserify.editor.src").concat(backends.nw)
        );
    });
    
    grunt.registerTask("lint", ["jshint", "csslint"]);

    grunt.registerTask("build", [
        "modify_json",
        "babel",
        "browserify:player",
        "uglify:player",
        "nunjucks_render",
        "nunjucks",
        "browserify:editor",
        "uglify:editor",
        "copy"
    ]);
    
    grunt.registerTask("nw-build",  ["backends-nw", "build"]);
    grunt.registerTask("web-build", ["backends-web", "build"]);
    
    grunt.registerTask("nw-bundle", [
        "nw-build",
        "nodewebkit",
        "rename",
        "compress"
    ]);
    
    grunt.registerTask("web-demo", [
        "web-build",
        "rsync"
    ]);
    
    grunt.registerTask("default", ["nw-bundle"]);
};
