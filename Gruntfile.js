module.exports = function(grunt) {
    grunt.initConfig({
        compass: {
            dist: {
                options: {
                    config: "config.rb"
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
            files: ['src/**/*.js', 'src/**/*.scss', 'test/**/*.js', 'test/**/*.html'],
            tasks: ['compass', 'qunit']
        },
        connect: {
            demo: {
                options: {
                    keepalive: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['watch']);
};