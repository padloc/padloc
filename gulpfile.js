/* eslint-env node */
"use strict";

const gulp = require("gulp");
const { argv } = require("yargs");
const { buildChrome, buildElectron, bundle, buildDashboard } = require("./lib/build");
const { updateLanguageFiles, buildTranslationsFile } = require("./lib/locale");

gulp.task("bundle", () => bundle(argv.dest, argv));

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

const supportedLanguages = ["en", "de", "es"];

gulp.task("update-langfiles", () => {
    return updateLanguageFiles("./index.html", "resources/translations/", supportedLanguages, "$l");
});

gulp.task("build-transfile", () => {
    return buildTranslationsFile("resources/translations/", "app/src/ui/locale/translations.js", supportedLanguages);
});

gulp.task("build-dashboard", () => {
    const { dest, watch } = argv;
    return buildDashboard(dest, watch);
});
