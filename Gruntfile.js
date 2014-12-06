module.exports = function(grunt) {
    "use strict";

    var nunjucks = require("nunjucks");

    grunt.loadNpmTasks("grunt-newer");
    grunt.loadNpmTasks("grunt-rename");
    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-csslint");
    grunt.loadNpmTasks("grunt-node-webkit-builder");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-rsync");
    grunt.loadNpmTasks("grunt-simple-mocha");
    grunt.loadNpmTasks("grunt-modify-json");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    
    var version = grunt.template.today("yy.mm.ddHHMM");
    var pkg = grunt.file.readJSON("package.json");

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
         * Compress the JavaScript code of the Sozi player.
         */
        uglify: {
            options: {
//                compress: false,
//                mangle: false,
//                beautify: true
            },
            player: {
                src: [
                    "bower_components/eventEmitter/EventEmitter.js",
                    "js/namespace.js",
                    "js/model/CameraState.js",
                    "js/model/Presentation.js",
                    "js/player/Camera.js",
                    "js/player/Viewport.js",
                    "js/player/timing.js",
                    "js/player/Animator.js",
                    "js/player/Player.js",
                    "js/player/media.js"
                ],
                dest: "build/player/sozi.player.min.js"
            }
        },

        /*
         * Precompile templates for the editor and player.
         */
        nunjucks_render: {
            player: {
                src: "templates/sozi.player.html",
                dest: "build/templates/sozi.player.html",
                context: {
                    playerJs: "<%= grunt.file.read('build/player/sozi.player.min.js') %>"
                }
            }
        },
        
        nunjucks: {
            editor: {
                src: [ "templates/sozi.editor.view.Timeline.html" ],
                dest: "build/templates/sozi.editor.view.templates.js"
            },
            player: {
                src: [ "<%= nunjucks_render.player.dest %>"],
                dest: "build/templates/sozi.player.templates.js"
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
                platforms: ["win", "osx", "linux64", "linux32"]
            },
            editor: [
                "package.json",
                "index.html",
                "js/**/*",
                "css/**/*",
                "vendor/**/*",
                "build/templates/*",
                "bower_components/**/*",
                "<%= nunjucks.editor.dest %>",
                "<%= uglify.player.dest %>"
            ].concat(
                Object.keys(pkg.dependencies).map(function (packageName) {
                    return "node_modules/" + packageName + "/**/*"
                })
            )
        },

        /*
         * Upload the web demonstration of the Sozi editor.
         */
        rsync: {
            options: {
                args: ["--verbose", "--update"]
            },
            demo: {
                options: {
                    src: [
                        "index.html",
                        "js",
                        "css",
                        "vendor",
                        "bower_components",
                        "build"
                    ],
                    exclude: ["build/*"],
                    include: ["build/templates"],
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
        win: "zip",
        osx: "zip"
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
                    // FIXME: preserve permissions for Linux executables
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

    grunt.registerTask("lint", ["jshint", "csslint"]);

    // nunjucks_render cannot use newer because build/player/sozi.player.min.js
    // is not identified as a source file
    grunt.registerTask("build", ["modify_json", "newer:uglify", "nunjucks_render", "newer:nunjucks"]);

    grunt.registerTask("default", ["build", "nodewebkit", "rename", "compress"]);
};
