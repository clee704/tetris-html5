module.exports = {

  // Directories for the build system.
  srcDir: require('./bower.json').appPath || 'src',
  tempDir: '.tmp',
  buildDir: 'build',

  // Port for the local web server.
  devPort: 9000,

  // Port for the LiveReload server.
  livereloadPort: 35729,

  // Port for the Karma test web server.
  testPort: 9876

};
