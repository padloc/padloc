/* jshint node: true */
"use strict";

var gulp = require("gulp"),
    stylus = require("gulp-stylus"),
    nib = require("nib"),
    watch = require("gulp-watch"),
    argv = require("yargs").argv,
    qunit = require("gulp-qunit"),
    jshint = require("gulp-jshint"),
    stylish = require("jshint-stylish");

gulp.task("stylus", function () {
    if (argv.watch) {
        watch({glob: "src/**/*.less"}, function(files) {
            return files
                .pipe(stylus({use: [nib()]}))
                .pipe(gulp.dest("./src"));
        });
    } else {
        gulp.src("./src/**/*.styl")
            .pipe(stylus({use: [nib()]}))
            .pipe(gulp.dest("./src"));
    }
});

gulp.task("test", function() {
    return gulp.src("./test/runner.html")
        .pipe(qunit());
});

function lint(files) {
    return gulp.src(files || "src/**/*.{js,html}")
        .pipe(jshint.extract("auto"))
        .pipe(jshint(".jshintrc"))
        .pipe(jshint.reporter(stylish));
}

gulp.task("lint", function () {
    if (argv.watch) {
        watch({glob: "src/**/*.{js,html}"}, function(files) {
            return files
                .pipe(jshint.extract("auto"))
                .pipe(jshint(".jshintrc"))
                .pipe(jshint.reporter(stylish));
        });
    } else {
        return lint();
    }
});