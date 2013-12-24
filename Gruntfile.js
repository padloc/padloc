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
            files: ['src/*.js', 'src/**/*.scss', 'test/*.js', 'test/*.html'],
            tasks: ['compass', 'qunit']
        }
    });

    // grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['watch']);
};