module.exports = {
    paths: [ "./player/js/*.js" ],
    linter: "jshint",
    linterOptions: {
        onevar: false,  // Allow multiple "var" statements
        forin: false,   // For-in statements need not filter
        predef: [ "module", "sozi" ]
    },
    excludes: []
};
