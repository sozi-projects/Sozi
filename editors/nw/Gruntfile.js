module.exports = function(grunt) {
    "use strict";

    grunt.loadNpmTasks("grunt-contrib-jshint");

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
        }
    });

    grunt.registerTask("default", []);
};
