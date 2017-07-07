/* eslint-env node */
"use strict";

const gulp = require("gulp");
const { argv } = require("yargs");
const { buildChrome, buildElectron, compile } = require("./lib/build");
const http = require("http");
const st = require("st");
const { updateLanguageFiles } = require("./lib/locale");

// Deploy a minified/built version of the app to a given destination folder
gulp.task("build", () => {
    let promises = [];
    const { mac, win, linux, chrome, release } = argv;

    if (chrome) {
        promises.push(buildChrome());
    }

    if (mac || win || linux) {
        promises.push(buildElectron({ mac, win, linux, release }));
    }

    return Promise.all(promises);
});

gulp.task("compile", () => {
    return compile(argv.watch);
});

gulp.task("serve", function() {
    var port = argv.port || 8080;
    console.log("Serving the app on a local server on port 8080. " +
        "To view it, open your web browser and navigate to http://localhost:8080/app/");
    http.createServer(
        st({ path: "", cache: false, index: "index.html" })
    ).listen(port);
});

gulp.task("update-langfiles", function() {
    const { funcname, targetdir, srcroot, lang } = argv;
    return updateLanguageFiles(srcroot, targetdir, lang, funcname);
});

gulp.task("default", ["compile", "serve"]);
