/* eslint-env node */
/* eslint-disable no-console */
"use strict";

var path = require("path"),
    gulp = require("gulp"),
    stylus = require("gulp-stylus"),
    nib = require("nib"),
    eslint = require("gulp-eslint"),
    Q = require("q"),
    vulcanize = require("gulp-vulcanize"),
    crisper = require("gulp-crisper"),
    rmdir = require("rimraf"),
    ncp = require("ncp").ncp,
    mkdirp = require("mkdirp"),
    insertLines = require("gulp-insert-lines"),
    stylemod = require("gulp-style-modules");

function compileCss() {
    var deferred = Q.defer();

    gulp.src("./src/**/*.styl")
        .pipe(stylus({use: [nib()]}))
        .pipe(stylemod())
        .pipe(gulp.dest("./src"))
        .on("end", function() {
            deferred.resolve();
        });

    return deferred.promise;
}

function runEslint(files) {
    gulp.src(files || "src/**/*.{js,html}")
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.results(function(results) {
            process.exit(results.errorCount);
        }));
}

function build(dest) {
    dest = dest || "build";
    return gulp.src("index.html")
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
}

function deploy(dest) {
    dest = dest || "deploy";
    console.log("Deploying app to " + path.resolve(process.cwd(), dest));
    Q(function() {
        console.log("Cleaning up existing target folder...");
        return Q.nfcall(rmdir, dest);
    })
    .then(function() {
        console.log("Creating target folder structure...");
        return Q.all([
            Q.nfcall(mkdirp, path.join(dest, "src")),
            Q.nfcall(mkdirp, path.join(dest, "lib"))
        ]);
    })
    .then(function() {
        console.log("Compiling css files...");
        return compileCss();
    })
    .then(function() {
        console.log("Building source...");
        return build(dest);
    })
    .then(function() {
        console.log("Copying assets...");
        return Q.all([
            Q.nfcall(ncp, "background.js", path.join(dest, "background.js")),
            Q.nfcall(ncp, "cordova.js", path.join(dest, "cordova.js")),
            Q.nfcall(ncp, "overrides.css", path.join(dest, "overrides.css")),
            Q.nfcall(ncp, "manifest.json", path.join(dest, "manifest.json")),
            Q.nfcall(ncp, path.join("src", "crypto.js"), path.join(dest, "src", "crypto.js")),
            Q.nfcall(ncp, path.join("lib", "sjcl.js"), path.join(dest, "lib", "sjcl.js")),
            Q.nfcall(ncp, "assets", path.join(dest, "assets"))
        ]);
    })
    .then(function() {
        console.log("Done!");
    });
}

module.exports = {
    compileCss: compileCss,
    runEslint: runEslint,
    build: build,
    deploy: deploy
};
