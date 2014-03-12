module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-node-webkit-builder");
    grunt.loadNpmTasks("grunt-zip");

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
        }
    });

    // Default options for target OS in nodewebkit task
    var targets = {
        linux32: {
            enabled: false,
            dir: "Sozi"
        },
        linux64: {
            enabled: false,
            dir: "Sozi"
        },
        win: {
            enabled: true,
            dir: "Sozi"
        },
        mac: {
            enabled: true,
            dir: "Sozi.app"
        }
    };

    for (var targetName in targets) {
        var targetOpt = grunt.config(["nodewebkit", "options", targetName]);
        var targetEnabled = targetOpt !== undefined ? targetOpt : targets[targetName].enabled;
        if (targetEnabled) {
            grunt.config(["zip", targetName], {
                cwd: "build/releases/Sozi/" + targetName,
                src: "build/releases/Sozi/" + targetName + "/" + targets[targetName].dir + "/**/*",
                dest: "build/Sozi-" + targetName + ".zip"
            });
        }
    }

    grunt.registerTask("default", ["nunjucks", "nodewebkit", "zip"]);
};
