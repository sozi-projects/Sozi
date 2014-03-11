module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-nunjucks");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-node-webkit-builder");

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

    grunt.registerTask("default", ["nunjucks", "nodewebkit"]);
};
