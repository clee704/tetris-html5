'use strict';

module.exports = function (grunt) {

  // Load grunt tasks automatically.
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times.
  require('time-grunt')(grunt);

  grunt.initConfig({

    config: require('./build.config.js'),

    //
    // File manipulation
    //
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

    // Copy remaining files
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

    //
    // CSS
    //
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

    // Add vendor prefixed styles
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

    //
    // Web optimization
    //
    // Renames files for browser caching purposes
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

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= config.srcDir %>/index.html',
      options: {
        dest: '<%= config.buildDir %>'
      }
    },

    // Performs rewrites based on rev and the useminPrepare configuration
    usemin: {
      html: ['<%= config.buildDir %>/**/*.html'],
      css: ['<%= config.buildDir %>/styles/**/*.css']
    },

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
          src: ['*.html'],
          dest: '<%= config.buildDir %>'
        }]
      }
    },

    //
    // Code quality & testing
    //
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        '<%= config.tempDir %>/scripts/**/*.js'
      ],
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/**/*.js']
      }
    },

    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      background: {
        singleRun: false,
        background: true
      },
      continuous: {
        singleRun: true,
        browsers: ['Firefox']
      }
    },

    //
    // Web servers
    //
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

    //
    // Etc
    //
    watch: {
      options: {
        spawn: false
      },
      js: {
        files: ['<%= config.srcDir %>/scripts/{,*/,*/*/}*.js'],
        tasks: ['newer:jshint:all', 'karma:background:run']
      },
      jsTest: {
        files: ['test/spec/{,*/}*.js'],
        tasks: ['newer:jshint:test', 'karma:background:run']
      },
      less: {
        files: ['<%= config.srcDir %>/styles/{,*/}*.less'],
        tasks: ['less:dev', 'autoprefixer']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      }
    },

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
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      dist: [
        'css:dist',
        'imagemin',
        'htmlmin'
      ]
    }

  });

  grunt.registerTask('css', function (target) {
    grunt.task.run([
      'less:' + target,
      'autoprefixer'
    ]);
  });

  grunt.registerTask('livereload', 'Spawn a separate process for LiveReload', function () {
    grunt.util.spawn({
      grunt: true,
      args: ['--gruntfile', 'Gruntfile-LR.js']
    }, function (error, result, code) {
      console.log(error, result, code);
    });
  });

  grunt.registerTask('serve', function (target) {
    grunt.task.run(target !== 'dist' ? [
      'clean:temp',
      'css:dev',
      'karma:background',
      'livereload',
      'watch'
    ] : [
      'connect:dist:keepalive'
    ]);
  });

  grunt.registerTask('test', [
    'clean:temp',
    'css:dev',
    'karma:continuous'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    'concurrent:dist',
      // 'css:dist',
      // 'copy:dev',
      // 'imagemin',
    'useminPrepare',
    'concat',
    'copy:dist',
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
