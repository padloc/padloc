/* eslint-env node */
"use strict";

const gulp = require("gulp");
const stylus = require("gulp-stylus");
const nib = require("nib");
const watch = require("gulp-watch");
const { argv } = require("yargs");
const stylemod = require("gulp-style-modules");
const { buildChrome, compileCss } = require("./lib/build.js");
const { eslint } = require("./lib/lint.js");

gulp.task("stylus", function() {
    if (argv.watch) {
        watch({glob: "src/**/*.styl"}, function(files) {
            return files
                .pipe(stylus({use: [nib()]}))
                .pipe(stylemod())
                .pipe(gulp.dest("./src"));
        });
    } else {
        return compileCss();
    }
});

gulp.task("eslint", eslint);

// Deploy a minified/built version of the app to a given destination folder
gulp.task("build", () => {
    let promises = [];

    if (argv.chrome) {
        promises.push(buildChrome());
    }

    return Promise.all(promises);
});
