/* eslint-env node */
"use strict";

const gulp = require("gulp");
const { argv } = require("yargs");
const { buildChrome, buildElectron, compile } = require("./lib/build");
const { eslint } = require("./lib/lint");
const http = require("http");
const st = require("st");

gulp.task("eslint", eslint);

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
    http.createServer(
        st({ path: "", cache: false, index: "index.html" })
    ).listen(port);
});

gulp.task("default", ["compile", "serve"]);
