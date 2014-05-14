// Spawn a separate process for LiveReload for a much better performance.
// See:
// https://github.com/gruntjs/grunt-contrib-watch/issues/69
// https://github.com/gruntjs/grunt-contrib-watch/issues/231
'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.initConfig({
    config: require('./build.config.js'),
    watch: {
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>',
          debounceDelay: 1000
        },
        files: [
          '<%= config.srcDir %>/{,*/}*.html',
          '<%= config.srcDir %>/scripts/{,*/,*/*/}*.js',
          '<%= config.srcDir %>/sounds/{,*/}*',
          '<%= config.tempDir %>/styles/{,*/}*.css'
        ]
      }
    },
    connect: {
      options: {
        port: '<%= config.devPort %>',
        hostname: '0.0.0.0',
        livereload: '<%= config.livereloadPort %>'
      },
      livereload: {
        options: {
          open: 'http://localhost:<%= connect.options.port %>',
          base: [
            '<%= config.tempDir %>',
            '<%= config.srcDir %>'
          ]
        }
      }
    }
  });
  grunt.registerTask('default', [
    'connect:livereload',
    'watch'
  ]);
};
