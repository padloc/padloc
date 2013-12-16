module.exports = function(grunt) {
    grunt.initConfig({
        sass: {                              // Task
            dist: {                            // Target
                options: {                       // Target options
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    src: ['src/**/*.scss'],
                    ext: '.css'
                }]
            }
        },
        qunit: {
            all: ['test/runner.html']
        },
        watch: {
            files: ['src/*.js', 'src/**/*.scss', 'test/*.js', 'test/*.html'],
            tasks: ['sass', 'qunit']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['watch']);
};