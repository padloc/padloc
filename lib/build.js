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
const builder = require("electron-builder");
const archiver = require("archiver");

const projectRoot = path.resolve(__dirname, "..");
const appDir = path.join(projectRoot, "app");
const { name, version, description, author, licence, homepage } =
    require(path.join(projectRoot, "package.json"));

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
function pexec(command, logStderr = true, logStdout) {
    return new Promise(function(resolve, reject) {
        var cp = exec(command, function(err, stdout) {
            if (err) {
                reject(err);
            }
            resolve(stdout);
        });

        if (logStderr) {
            cp.stderr.on("error", console.error);
        }
        if (logStdout) {
            cp.stdout.on("data", console.log);
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

function buildChrome() {
    const dest = path.join(projectRoot, "dist/chrome");
    const buildDir = path.join(dest, "padlock");
    return build(buildDir)
        .then(() => copyFiles(path.join(projectRoot, "chrome"), buildDir, [
            "manifest.json",
            "background.js",
            "icons"
        ]))
        .then(() => new Promise((resolve, reject) => {
            let output = fs.createWriteStream(path.join(dest, `padlock-v${version}-chrome.zip`));
            let archive = archiver.create("zip");
            archive.directory(buildDir, "padlock");
            archive.on("error", reject);
            archive.on("finish", resolve);
            archive.pipe(output);
            archive.finalize();
        }));
}

function buildMac() {
    return build("dist/electron")
        .then(() => copyFiles("electron", "dist/electron", [
            "main.js",
            "package.json"
        ]))
        .then(() => builder.build({
            targets: builder.Platform.MAC.createTarget(),
            devMetadata: {
                build: {
                    appId: "com.maklesoft.padlock"
                },
                directories: {
                    buildResources: "electron",
                    app: "dist/electron",
                    output: "dist"
                }
            },
            appMetadata: {
                name, version, description, author, licence, homepage,
                productName: "Padlock",
                main: "main.js"
            },
            dir: true
        }));
}

module.exports = {
    compileCss: compileCss,
    build: build,
    buildChrome: buildChrome,
    buildMac: buildMac
};
