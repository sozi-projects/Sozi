module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-csslint");
    grunt.loadNpmTasks("grunt-node-webkit-builder");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-rsync");

    var version = grunt.template.today("yy.mm.ddHHMM");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        jshint: {
            options: {
                jshintrc: true
            },
            all: [
                "js/**/*.js"
            ]
        },

        csslint: {
            options: {
                csslintrc: ".csslintrc"
            },
            all: [
                "css/**/*.css"
            ]
        },

        nunjucks: {
            templates: {
                src: "templates/*",
                dest: "build/templates/sozi.editor.view.templates.js"
            }
        },

        nodewebkit: {
            options: {
                version: "0.8.4",
                build_dir: "build",
                win: true,
                mac: true,
                linux32: true,
                linux64: true
            },
            all: [
                "package.json",
                "index.html",
                "js/**/*",
                "css/**/*",
                "vendor/**/*",
                "<%= nunjucks.templates.dest %>"
            ]
        },

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

    // Default options for target OS in nodewebkit task
    var targets = {
        linux32: {
            enabled: false,
            dir: "Sozi",
            mode: "tgz"
        },
        linux64: {
            enabled: false,
            dir: "Sozi",
            mode: "tgz"
        },
        win: {
            enabled: true,
            dir: "Sozi",
            mode: "zip"
        },
        mac: {
            enabled: true,
            dir: "Sozi.app",
            mode: "zip"
        }
    };

    for (var targetName in targets) {
        var targetOpt = grunt.config(["nodewebkit", "options", targetName]);
        var targetEnabled = targetOpt !== undefined ? targetOpt : targets[targetName].enabled;
        if (targetEnabled) {
            grunt.config(["compress", targetName], {
                options: {
                    // FIXME: preserve permissions for Linux executables
                    mode: targets[targetName].mode,
                    archive: "build/Sozi-" + targetName + "." + targets[targetName].mode
                },
                expand: true,
                cwd: "build/releases/Sozi/" + targetName,
                src: [targets[targetName].dir + "/**/*"]
            });
        }
    }

    grunt.registerTask("lint", ["jshint", "csslint"]);
    grunt.registerTask("default", ["nunjucks", "nodewebkit", "compress"]);
};
