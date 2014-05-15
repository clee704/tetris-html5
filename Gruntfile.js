module.exports = function (grunt) {
  'use strict';

  // Load grunt tasks automatically.
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times.
  require('time-grunt')(grunt);

  grunt.initConfig({

    config: require('./build.config.js'),

    clean: {
      temp: '<%= config.tempDir %>',
      dist: {
        files: [{
          dot: true,
          src: [
            '<%= config.tempDir %>',
            '<%= config.buildDir %>/*',
            '!<%= config.buildDir %>/.git*'
          ]
        }]
      }
    },

    // Copy remaining files that are not processed by other tasks.
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= config.srcDir %>',
          dest: '<%= config.buildDir %>',
          src: [
            '*.{ico,png,txt}',
            'fonts/**/*.{eot,ttf}',
            'images/**/*.{png,jpg,jpeg,gif,webp,svg}',
            'sounds/**/*.{wav,ogg,mp3}'
          ]
        }]
      }
    },

    // Compile LESS files to CSS.
    less: {
      options: {
        paths: '<%= config.srcDir %>/styles'
      },
      files: [{
        expand: true,
        cwd: '<%= config.srcDir %>/styles',
        dest: '<%= config.tempDir %>/styles',
        src: 'main.less',
        ext: '.css'
      }],
      dev: {
        options: {
          dumpLineNumbers: true
        },
        files: '<%= less.files %>'
      },
      dist: {
        options: {
          compress: true
        },
        files: '<%= less.files %>'
      }
    },

    // Add vendor prefixes to cutting-edge properties.
    autoprefixer: {
      options: {
        browsers: ['last 2 version', 'ie >= 9']
      },
      run: {
        files: [{
          expand: true,
          cwd: '<%= config.tempDir %>/styles',
          dest: '<%= config.tempDir %>/styles',
          src: '**/*.css'
        }]
      }
    },

    // Minify image files without losing quiality.
    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= config.srcDir %>/images',
          dest: '<%= config.buildDir %>/images',
          src: '**/*.{png,jpg,jpeg,gif}'
        }]
      }
    },

    // Minify HTML files. Also serve as to just copying files.
    htmlmin: {
      dist: {
        options: {
          // Optional configurations that you can uncomment to use
          // removeCommentsFromCDATA: true,
          // collapseBooleanAttributes: true,
          // removeAttributeQuotes: true,
          // removeRedundantAttributes: true,
          // useShortDoctype: true,
          // removeEmptyAttributes: true,
          // removeOptionalTags: true*/
        },
        files: [{
          expand: true,
          cwd: '<%= config.srcDir %>',
          dest: '<%= config.buildDir %>',
          src: '*.html'
        }]
      }
    },

    // Do RequireJS optimization.
    requirejs: {
      dist: {
        options: {
          baseUrl: '<%= config.srcDir %>/scripts',
          mainConfigFile: '<%= config.srcDir %>/scripts/config.js',
          name: '../bower_components/almond/almond',
          include: ['main'],
          out: '<%= config.tempDir %>/scripts/optimized.js',
          optimize: 'none'
        }
      }
    },

    // Modify the RequireJS script tag to use the optimized file.
    replace: {
      requirejs: {
        files: [{
          expand: true,
          cwd: '<%= config.buildDir %>',
          dest: '<%= config.buildDir %>',
          src: 'index.html'
        }],
        options: {
          patterns: [{
            match: /<script data-main="scripts\/main" src="bower_components\/requirejs\/require.js"><\/script>/,
            replacement: '<script src="scripts/optimized.js"></script>'
          }]
        }
      }
    },

    // Read HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Create configurations in memory so
    // additional tasks can operate on them.
    useminPrepare: {
      html: '<%= config.srcDir %>/index.html',
      options: {
        dest: '<%= config.buildDir %>',
        staging: '<%= config.tempDir %>'
      }
    },

    // Minify JavaScript files. Files in usemin blocks are automatically added
    // by useminPrepare.
    uglify: {
      requirejs: {
        files: [{
          expand: true,
          cwd: '<%= config.tempDir %>/scripts',
          dest: '<%= config.buildDir %>/scripts',
          src: 'optimized.js'
        }]
      }
    },

    // Rename files for browser caching purposes.
    // Sound files are not renamed as it seems not worth the trouble.
    rev: {
      dist: {
        files: {
          src: [
            '<%= config.buildDir %>/fonts/**/*.{eot,ttf}',
            '<%= config.buildDir %>/images/**/*.{png,jpg,jpeg,gif,webp,svg}',
            '<%= config.buildDir %>/scripts/**/*.js',
            '<%= config.buildDir %>/styles/**/*.css',
          ]
        }
      }
    },

    // Perform rewrites based on rev and the useminPrepare configuration.
    usemin: {
      html: ['<%= config.buildDir %>/**/*.html'],
      css: ['<%= config.buildDir %>/styles/**/*.css']
    },

    // Lint JavaScript files.
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      src: [
        'Gruntfile.js',
        '<%= config.srcDir %>/scripts/**/*.js'
      ],
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/**/*.js']
      }
    },

    // Run a single run of tests or continuously in background.
    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      single: {
        singleRun: true
      },
      background: {
        singleRun: false,
        background: true
      }
    },

    // Run a local webserver.
    connect: {
      options: {
        port: '<%= config.devPort %>',
        hostname: '0.0.0.0'
      },
      dist: {
        options: {
          base: '<%= config.buildDir %>'
        }
      }
    },

    // Watch files for changes and run corresponding tasks.
    watch: {
      options: {
        spawn: false
      },
      js: {
        files: ['<%= config.srcDir %>/scripts/{,*/,*/*/}*.js'],
        tasks: ['newer:jshint:src', 'karma:background:run']
      },
      test: {
        files: ['test/spec/{,*/}*.js'],
        tasks: ['newer:jshint:test', 'karma:background:run']
      },
      less: {
        files: ['<%= config.srcDir %>/styles/{,*/}*.less'],
        tasks: ['css:dev']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      }
    },

    // Create a cache manifest so that the app can be used offline.
    manifest: {
      generate: {
        options: {
          basePath: '<%= config.buildDir %>'
        },
        src: [
          'index.html',
          'fonts/**/*.{eot,ttf}',
          'images/**/*.{png,jpg,jpeg,gif,webp,svg}',
          'scripts/**/*.js',
          'sounds/**/*.{wav,ogg,mp3}',
          'styles/**/*.css'
        ],
        dest: '<%= config.buildDir %>/manifest.appcache'
      }
    }

  });

  // Generate CSS files by first compiling LESS and then adding vendor
  // prefixes to cutting-edge CSS properties.
  grunt.registerTask('css', function (target) {
    grunt.task.run([
      'less:' + target,
      'autoprefixer'
    ]);
  });

  grunt.registerTask('livereload',
                     'Spawn a separate process for LiveReload',
                     function () {
    grunt.util.spawn({
      grunt: true,
      args: ['--gruntfile', 'Gruntfile-LR.js']
    }, function (error, result, code) {
      console.log(error, result, code);
    });
  });

  grunt.registerTask('serve', [
    'clean:temp',
    'css:dev',
    'karma:background',
    'livereload',
    'watch'
  ]);

  grunt.registerTask('serve:dist', [
    'connect:dist:keepalive'
  ]);

  grunt.registerTask('test', [
    'clean:temp',
    'css:dev',
    'karma:single'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'copy:dist',
    'css:dist',
    'imagemin',
    'htmlmin',
    'requirejs',
    'replace',
    'useminPrepare',
    'concat',
    'cssmin',
    'uglify',
    'rev',
    'usemin',
    'manifest'
  ]);

  grunt.registerTask('default', [
    'newer:jshint',
    'test',
    'build'
  ]);
};
