module.exports = function(grunt) {
    "use strict";

    var nunjucks = require("nunjucks");
    //var process = require("process");
    var path = require("path");

    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-csslint");
    grunt.loadNpmTasks("grunt-node-webkit-builder");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-rsync");
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-modify-json');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    
    var version = grunt.template.today("yy.mm.ddHHMM");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

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
                ui: 'bdd',
                reporter: 'tap'
            },
            all: {
                src: ['test/**/*.mocha.js']
            }
        },

        /*
         * Compress the JavaScript code of the Sozi player.
         */
        uglify: {
            options: {
//                mangle: false,
//                beautify: true
            },
            player: {
                src: [
                    "js/namespace.js",
                    "js/sozi.model.Object.js",
                    "js/sozi.model.Presentation.js",
                    "js/sozi.player.Camera.js",
                    "js/sozi.player.Viewport.js",
                    "js/sozi.player.timing.js",
                    "js/sozi.player.Animator.js",
                    "js/sozi.player.Player.js"
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
            ]
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
    var targets = {
        linux32: {
            cd: false,
            dir: "linux32",
            mode: "tgz"
        },
        linux64: {
            cd: false,
            dir: "linux64",
            mode: "tgz"
        },
        win: {
            cd: false,
            dir: "win",
            mode: "zip"
        },
        osx: {
            cd: true,
            dir: "Sozi.app",
            mode: "zip"
        }
    };

    /*
     * Compress enabled node-webkit applications
     * for various platforms.
     */
    for (var targetName in targets) {
        if (grunt.config(["nodewebkit", "options", "platforms"]).indexOf(targetName) >= 0) {
            grunt.config(["compress", targetName], {
                options: {
                    // FIXME: preserve permissions for Linux executables
                    mode: targets[targetName].mode,
                    archive: "build/Sozi-" + targetName + "." + targets[targetName].mode
                },
                expand: true,
                cwd: "build/Sozi/" + (targets[targetName].cd ? targetName : ""),
                src: [targets[targetName].dir + "/**/*"]
            });
        }
    }

    grunt.registerMultiTask("nunjucks_render", function () {
        var result = nunjucks.render(this.data.src, this.data.context);
        grunt.file.write(this.data.dest, result);
        grunt.log.writeln('File ' + this.data.dest + ' created.');
    });

    grunt.registerTask("lint", ["jshint", "csslint"]);
    grunt.registerTask("build", ["modify_json", "uglify", "nunjucks_render", "nunjucks"]);
    grunt.registerTask("default", ["build", "nodewebkit", "compress"]);
};
