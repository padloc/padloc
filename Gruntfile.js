module.exports = function(grunt) {
    grunt.initConfig({
        sass: {                              // Task
            dist: {                            // Target
                options: {                       // Target options
                    style: 'expanded'
                },
                files: {                         // Dictionary of files
                    'main.css': 'main.scss',       // 'destination': 'source'
                    'widgets.css': 'widgets.scss'
                }
            }
        },
        qunit: {
            all: ['test/runner.html']
        },
        watch: {
            files: ['src/*.js', 'test/*.js', 'test/*.html'],
            tasks: ['qunit']
        }
    });

    // grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // grunt.registerTask('default', ['sass']);
    grunt.registerTask('default', ['qunit']);
};