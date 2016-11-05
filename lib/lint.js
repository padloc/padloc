"use strict";

const gulp = require("gulp");
const eslint = require("gulp-eslint");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

function runEslint(files) {
    gulp.src(files || "app/**/*.{js,html}", {cwd: projectRoot})
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.results(function(results) {
            process.exit(results.errorCount);
        }));
}

module.export = {
    eslint: runEslint
};
