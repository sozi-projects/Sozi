module.exports = {
    paths: [ "./player/js/*.js" ],
    linter: "jshint",
    linterOptions: {
        onevar: false, // Allow multiple "var" statements
        predef: [ "module", "sozi" ]
    },
    excludes: []
};
