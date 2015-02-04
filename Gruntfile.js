module.exports = function(grunt) {
    "use strict";

    var nunjucks = require("nunjucks");

    require("load-grunt-tasks")(grunt);
    
    var version = grunt.template.today("yy.mm.ddHHMM");
    var pkg = grunt.file.readJSON("package.json");

    var editorJs = [
        "bower_components/eventEmitter/EventEmitter.js",
        "<%= nunjucks.player.dest %>",
        "build/js/namespace.js",
        "build/js/model/CameraState.js",
        "build/js/model/Presentation.js",
        "build/js/model/Presentation.upgrade.js",
        "build/js/player/Camera.js",
        "build/js/player/Viewport.js",
        "build/js/model/Selection.js",
        "build/js/view/VirtualDOMView.js",
        "build/js/view/Toolbar.js",
        "build/js/view/Preview.js",
        "build/js/view/Timeline.js",
        "build/js/view/Properties.js",
        "build/js/backend/AbstractBackend.js",
        "build/js/backend/FileReader.js",
        "build/js/backend/NodeWebkit.js",
        "build/js/backend/GoogleDrive.js",
        "build/js/backend/GoogleDrive.config.js",
        "build/js/Controller.js",
        "build/js/index.js"
    ];
    var playerJs = [
        "bower_components/eventEmitter/EventEmitter.js",
        "build/js/namespace.js",
        "build/js/model/CameraState.js",
        "build/js/model/Presentation.js",
        "build/js/player/Camera.js",
        "build/js/player/Viewport.js",
        "build/js/player/timing.js",
        "build/js/player/Animator.js",
        "build/js/player/Player.js",
        "build/js/player/media.js"
    ];

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

        "6to5": {
            options: {
                whitelist: ["es6.arrowFunctions"]
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
                    external: ["nw.gui", "fs", "path"]
                },
                src: editorJs,
                dest: "build/js/sozi.editor.js"
            },
            player: {
                src: playerJs,
                dest: "build/js/sozi.player.js"
            }
        },

        /*
         * Compress the JavaScript code of the Sozi player.
         */
        uglify: {
            options: {
                compress: false,
                mangle: false,
                beautify: true
            },
            editor: {
                src: "<%= browserify.editor.dest %>",
                dest: "build/js/sozi.editor.min.js"
            },
            player: {
                src: "<%= browserify.player.dest %>",
                dest: "build/js/sozi.player.min.js"
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
                    playerJs: "<%= grunt.file.read('build/js/sozi.player.min.js') %>"
                }
            }
        },
        
        nunjucks: {
            player: {
                src: ["<%= nunjucks_render.player.dest %>"],
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
                platforms: ["win64", "osx64", "linux64"]
            },
            editor: [
                "package.json",
                "index.html",
                "<%= uglify.editor.dest %>",
                "css/**/*",
                "vendor/**/*",
                "bower_components/**/*"
            ].concat(
                Object.keys(pkg.dependencies).map(function (packageName) {
                    return "node_modules/" + packageName + "/**/*";
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
                        "css",
                        "vendor",
                        "bower_components",
                        "build"
                    ],
                    exclude: ["build/templates"],
                    include: ["<%= uglify.editor.dest %>"],
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

    // nunjucks_render cannot use newer because build/js/sozi.player.min.js
    // is not identified as a source file
    grunt.registerTask("build", ["modify_json", "newer:6to5", "newer:browserify", "newer:uglify", "nunjucks_render", "newer:nunjucks"]);

    grunt.registerTask("default", ["build", "nodewebkit", "rename", "compress"]);
};
