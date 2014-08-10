/* jshint node: true */
"use strict";

var gulp = require("gulp"),
    stylus = require("gulp-stylus"),
    nib = require("nib"),
    watch = require("gulp-watch"),
    argv = require("yargs").argv,
    qunit = require("gulp-qunit"),
    jshint = require("gulp-jshint"),
    stylish = require("jshint-stylish"),
    Q = require("q"),
    vulcan = require("vulcanize"),
    rmdir = require("rimraf"),
    ncp = require("ncp").ncp,
    path = require("path"),
    mkdirp = require("mkdirp");

function compileCss() {
    var deferred = Q.defer();

    gulp.src("./src/**/*.styl")
        .pipe(stylus({use: [nib()]}))
        .pipe(gulp.dest("./src"))
        .on("end", function() {
            deferred.resolve();
        });

    return deferred.promise;
}

function build() {
    var deferred = Q.defer();

    vulcan.setOptions({
        verbose: true,
        inline: true,
        csp: true,
        input: "index.html",
        output: "build.html",
        excludes: {
            styles: ["src/styles/overrides.css"],
            scripts: ["cordova.js"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        vulcan.processDocument();
        deferred.resolve();
    });

    return deferred.promise;
}

function lint(files) {
    return gulp.src(files || "src/**/*.{js,html}")
        .pipe(jshint.extract("auto"))
        .pipe(jshint(".jshintrc"))
        .pipe(jshint.reporter(stylish));
}

gulp.task("stylus", function () {
    if (argv.watch) {
        watch({glob: "src/**/*.styl"}, function(files) {
            return files
                .pipe(stylus({use: [nib()]}))
                .pipe(gulp.dest("./src"));
        });
    } else {
        return compileCss();
    }
});

gulp.task("test", function() {
    return gulp.src("./test/runner.html")
        .pipe(qunit());
});

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

// Deploy a minified/built version of the app to a given destination folder
gulp.task("deploy", function() {
    var dest = argv.dest || "deploy";
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
        return build();
    })
    .then(function() {
        console.log("Copying assets...");
        return Q.all([
            Q.nfcall(ncp, "build.html", path.join(dest, "index.html")),
            Q.nfcall(ncp, "build.js", path.join(dest, "build.js")),
            Q.nfcall(ncp, path.join("src", "crypto.js"), path.join(dest, "src", "crypto.js")),
            Q.nfcall(ncp, path.join("lib", "sjcl.js"), path.join(dest, "lib", "sjcl.js")),
            Q.nfcall(ncp, "assets", path.join(dest, "assets"))
        ]);
    })
    .then(function() {
        console.log("Done!");
        process.exit(0);
    });
});