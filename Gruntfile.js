module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('noop', []);

  grunt.registerTask('default', ['sass', 'connect', 'watch']);

  grunt.initConfig({
    watch: {
      sass: {
        files: ['./css/*.scss'],
        tasks: ['sass'],
        livereload: 1337,
      },
      css: {
          files: `./css/*.css`,
          tasks: ['noop'],
          livereload: 1337,
      },
      html: {
        files: ['./*.html'],
        tasks: [],
        livereload: 1337,
      },
    },
    sass: {
        datagrid: {
            files: {
                'css/datagrid.css': 'css/datagrid.scss'
            }
        }
    },
    connect: {
      server: {
        options: {
          port: 1337,
          keepalive: false,
          open: true,
        },
        livereload: 1337,
      }
    }
  });
}
