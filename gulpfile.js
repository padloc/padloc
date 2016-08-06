/* eslint-env node */
"use strict";

var gulp = require("gulp"),
    stylus = require("gulp-stylus"),
    nib = require("nib"),
    watch = require("gulp-watch"),
    argv = require("yargs").argv,
    stylemod = require("gulp-style-modules"),
    tools = require("./tools.js");

gulp.task("stylus", function() {
    if (argv.watch) {
        watch({glob: "src/**/*.styl"}, function(files) {
            return files
                .pipe(stylus({use: [nib()]}))
                .pipe(stylemod())
                .pipe(gulp.dest("./src"));
        });
    } else {
        return tools.compileCss();
    }
});

gulp.task("eslint", function() {
    tools.eslint();
});

// Deploy a minified/built version of the app to a given destination folder
gulp.task("deploy", function() {
    tools.deploy(argv.dest);
});
