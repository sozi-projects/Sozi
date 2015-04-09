// Just build for x64 architectures
// and disable code uglify for better debugging
var buildConfig = {
    platforms:[
      "win64", "osx64", "linux64"
    ],
    uglifyOptions:
    {
      compress: false,
      mangle: false,
      beautify: true
    }
};

module.exports = buildConfig;
