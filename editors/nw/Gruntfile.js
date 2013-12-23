module.exports = function(grunt) {
        grunt.loadNpmTasks("grunt-contrib-jshint");

    var version = grunt.template.today("yy.mm.ddHHMM");
    
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        
        jshint: {
            options: {
                undef: true,
                unused: true,
                newcap: false,
                
                browser: true,
                devel: true,
                jquery: true,
                node: true,
                
                globals: {
                    namespace: true,
                    sozi: true
                }
            },
            all: [
                "js/**/*.js"
            ]
        }
    });
    
    grunt.registerTask("default", []);
}
