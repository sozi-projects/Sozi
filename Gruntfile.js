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
        },

        zip: {
            win: {
                cwd: "build/releases/Sozi/win",
                src: "build/releases/Sozi/win/Sozi/**/*",
                dest: "build/Sozi-win.zip"
            },
            mac: {
                cwd: "build/releases/Sozi/mac",
                src: "build/releases/Sozi/mac/Sozi.app/**/*",
                dest: "build/Sozi-mac.zip"
            },
            linux32: {
                cwd: "build/releases/Sozi/linux32",
                src: "build/releases/Sozi/linux32/Sozi/**/*",
                dest: "build/Sozi-linux32.zip"
            },
            linux64: {
                cwd: "build/releases/Sozi/linux64",
                src: "build/releases/Sozi/linux64/Sozi/**/*",
                dest: "build/Sozi-linux64.zip"
            }
        }
    });

    grunt.registerTask("default", ["nunjucks", "nodewebkit", "zip"]);
};
