module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express-server');

  grunt.registerTask('noop', []);

  grunt.registerTask('default', ['sass', 'express', 'connect', 'watch']);

  grunt.initConfig({
    watch: {
      sass: {
        files: ['./css/*.scss'],
        tasks: ['sass'],
        options: {
            livereload: true,
        }
      },
      livereload: {
          files: ['./css/*.css', './views/*.html'],
          tasks: ['noop'],
          options: {
              livereload: true,
          }
      },
    },
    sass: {
        datagrid: {
            files: {
                'css/datagrid.css': 'css/datagrid.scss'
            }
        }
    },
    express: {
        dev: {
            options: {
                script: 'app.js',
            },
        },
    },
    connect: {
        server: {
          options: {
            port: 1337,
            keepalive: false,
            open: {
              target: 'http://localhost:8080',
            },
          },
          livereload: true,
        }
    }
  });
}
