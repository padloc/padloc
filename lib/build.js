/* eslint-env node */
/* eslint-disable no-console */
"use strict";

const path = require("path");
const fs = require("fs-extra");
const gulp = require("gulp");
const stylus = require("gulp-stylus");
const nib = require("nib");
const Q = require("q");
const vulcanize = require("gulp-vulcanize");
const crisper = require("gulp-crisper");
const rmdir = require("rimraf");
const insertLines = require("gulp-insert-lines");
const stylemod = require("gulp-style-modules");
const { exec } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const appDir = path.join(projectRoot, "app");

function compileCss() {
    var deferred = Q.defer();

    gulp.src("./src/**/*.styl", {cwd: appDir})
        .pipe(stylus({use: [nib()]}))
        .pipe(stylemod())
        .pipe(gulp.dest("./src", {cwd: appDir}))
        .on("end", function() {
            deferred.resolve();
        });

    return deferred.promise;
}

function copyFiles(source, dest, files) {
    return Q.all(files.map((f) => Q.nfcall(fs.copy, path.resolve(source, f), path.resolve(dest, f))));
}

/**
 * Wraps a `require('child_process').exec(command)` call into a Promise
 * @param {String} command
 * @param {Boolean} logStderr Whether or not to write stderr of child process to stderr or main process
 * @param {Boolean} logStdout Whether or not to write stdout of child process to stdout or main process
 * @return {Promise}
 */
function pexec(command, logStderr=true, logStdout) {
    return new Promise(function(resolve, reject) {
        var cp = exec(command, function(err, stdout) {
            if (err) {
                reject(err);
            }
            resolve(stdout);
        });

        if (logStderr) {
            cp.stderr.on('error', console.error);
        }
        if (logStdout) {
            cp.stdout.on('data', console.log);
        }
    });
}

function build(dest = "build") {
    return pexec(`pushd ${appDir} && bower install && popd`)
        .then(() => Q.nfcall(rmdir, dest))
        .then(() => compileCss())
        .then(() => {
            gulp.src("index.html", {cwd: appDir})
                .pipe(vulcanize({
                    inlineScripts: true,
                    inlineCss: true,
                    excludes: [
                        "overrides.css",
                        "cordova.js"
                    ]
                }))
                .pipe(insertLines({
                    "after": /<head>/i,
                    "lineAfter": "<meta http-equiv=\"Content-Security-Policy\"" +
                    " content=\"default-src 'self' gap:; style-src 'self'" +
                    " 'unsafe-inline'; connect-src https://*\">"
                }))
                .pipe(crisper())
                .pipe(gulp.dest(dest));
        })
        .then(() => copyFiles(appDir, dest, [
            "assets",
            "cordova.js",
            "overrides.css",
            "src/crypto.js",
            "bower_components/sjcl/sjcl.js"
        ]));
}

function buildChrome(dest = "dist/chrome") {
    return build(dest)
        .then(() => copyFiles(path.join(projectRoot, "chrome"), dest, [
            "manifest.json",
            "background.js",
            "icons"
        ]));
}

module.exports = {
    compileCss: compileCss,
    build: build,
    buildChrome: buildChrome
};
