/* eslint-env node */
/* eslint-disable no-console */
"use strict";

const path = require("path");
const fs = require("fs-extra");
const gulp = require("gulp");
const rimraf = require("rimraf");
const insertLines = require("gulp-insert-lines");
const { exec } = require("child_process");
const builder = require("electron-builder");
const archiver = require("archiver");
const browserify = require("browserify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
const watchify = require("watchify");
const gutil = require("gulp-util");

const projectRoot = path.resolve(__dirname, "..");
const appDir = path.join(projectRoot, "app");

function promisify(f) {
    return function() {
        return new Promise((resolve, reject) => {
            f(...arguments, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };
}

const copy = promisify(fs.copy);
const rmdir = promisify(rimraf);
const writeFile = promisify(fs.writeFile);

function compileCore(watch = false) {
    let b = browserify(`${appDir}/src/core/main.ts`, {
        standalone: "padlock",
        cache: {},
        packageCache: {},
        debug: true
    }).plugin(tsify);

    function bundle() {
        const stream = b.bundle();
        stream.on("error", (e) => gutil.log(e.message));

        return stream
            .pipe(source("padlock.js"))
            .pipe(gulp.dest(`${appDir}/src/`));
    }

    if (watch) {
        b.plugin(watchify);
        b.on("update", bundle);
    }

    return bundle();
}

function compileCoreLite(watch = false) {
    let b = browserify(`${appDir}/src/core/main-lite.ts`, {
        standalone: "padlock",
        cache: {},
        packageCache: {},
        debug: true
    }).plugin(tsify);

    function bundle() {
        const stream = b.bundle();
        stream.on("error", (e) => gutil.log(e.message));

        return stream
            .pipe(source("padlock-lite.js"))
            .pipe(gulp.dest(`${appDir}/src/`));
    }

    if (watch) {
        b.plugin(watchify);
        b.on("update", bundle);
    }

    return bundle();
}

function compileTests(watch = false) {
    let b = browserify(`${projectRoot}/test/main.ts`, {
        cache: {},
        packageCache: {},
        debug: true
    }).plugin(tsify);

    function bundle() {
        return b.bundle()
            .pipe(source("tests.js"))
            .pipe(gulp.dest(`${projectRoot}/test/`));
    }

    if (watch) {
        b.plugin(watchify);
        b.on("update", bundle);
    }

    return bundle();
}

function compile(watch = false) {
    compileCore(watch);
    compileCoreLite(watch);
    compileTests(watch);
}

function copyFiles(source, dest, files) {
    return Promise.all(files.map((f) => copy(path.resolve(source, f), path.resolve(dest, f))));
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

function bundle(dest = "build") {
    const bundler = `${projectRoot}/node_modules/polymer-bundler/lib/bin/polymer-bundler.js`;
    const crisper = `${projectRoot}/node_modules/crisper/bin/crisper`;
    const flags = `--inline-scripts --inline-css -r ${appDir}`;
    let cmd = `node ${bundler} ${flags} index.html | node ${crisper} --html ${dest}/index.html --js ${dest}/build.js`;
    return rmdir(dest)
        .then(() => copyFiles(appDir, dest, ["assets"]))
        .then(() => pexec(cmd));
}

function buildChrome() {
    const { version, description, author } = require(path.resolve(projectRoot, "package.json"));
    const dest = path.join(projectRoot, "dist/chrome");
    const buildDir = path.join(dest, "padlock");
    const chromeDir = path.join(projectRoot, "resources/chrome");
    // The manifest file does not allow prerelease indicators in the version field
    const v = version.indexOf("-") === -1 ? version : version.substr(0, version.indexOf("-"));
    return bundle(buildDir)
        .then(() => copyFiles(chromeDir, buildDir, ["background.js", "icons"]))
        .then(() => {
            const manifest = require(path.join(chromeDir, "manifest.json"));
            Object.assign(manifest, { version: v, description, author });
            return writeFile(path.join(buildDir, "manifest.json"), JSON.stringify(manifest, null, "  "));
        })
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

function buildElectron(options) {
    const buildDir = path.join("dist", "electron");
    const { name, version, description, author, licence, homepage, dependencies, main } =
        require(path.join(projectRoot, "package.json"));
    const appMeta = {
        name, version, description, author, licence, homepage, dependencies, main,
        productName: "Padlock"
    };

    return rmdir(buildDir)
        .then(() => copyFiles(".", "dist/electron", [ "main.js" ]))
        .then(() => writeFile(path.join(buildDir, "package.json"), JSON.stringify(appMeta, null, "  ")))
        .then(() => pexec(`pushd ${buildDir} && npm install --production && popd`))
        .then(() => bundle(path.join(buildDir, "app")))
        .then(() => builder.build({
            mac: options.mac && ["default"],
            win: options.win && ["nsis"],
            linux: options.linux && ["AppImage"],
            config: {
                appId: "com.maklesoft.padlock",
                publish: {
                    provider: "github",
                    owner: "maklesoft",
                    repo: "padlock"
                },
                directories: {
                    buildResources: "resources/electron",
                    app: "dist/electron",
                    output: "dist"
                },
                win: {
                    publisherName: "Open Source Developer, Martin Kleinschrodt"
                },
                linux: {
                    category: "Utility"
                },
                protocols: {
                    name: "Padlock",
                    schemes: ["padlock"]
                }
            },
            publish: options.release && "always"
        }));
}

function streamToPromise(stream) {
    return new Promise(function(resolve, reject) {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}

function buildCordova(platform, dest) {
    // iOS requires the source files to be bundled into a single file
    // whereas doing that causes problems on Android, so we leave the files as-is.
    const prepFiles = platform === "ios" ? bundle(dest) :
        copyFiles(appDir, dest, ["bower_components", "assets", "src", "index.html"]);

    return prepFiles
        .then(() => {
            const stream = gulp.src("index.html", {cwd: dest})
                .pipe(insertLines({
                    "after": /<head>/i,
                    "lineAfter":
`
        <script src="cordova.js"></script>
        <script>
            document.addEventListener("deviceready", function() {
                "use strict";
                // Replace window.open method with the inappbrowser equivalent
                window.open = cordova.InAppBrowser.open;
                // Hide status bar on iOS
                if (/ipad|iphone|ipod/i.test(navigator.platform)) {
                    StatusBar.hide();
                }
            });
        </script>
`
                }))
                .pipe(gulp.dest(dest));

            return streamToPromise(stream);
        });
}

function buildDashboard(dest = "build/dashboard", watch = false) {
    const bundler = `${projectRoot}/node_modules/polymer-bundler/lib/bin/polymer-bundler.js`;
    const crisper = `${projectRoot}/node_modules/crisper/bin/crisper`;
    const flags = `--inline-scripts --inline-css -r ${appDir}`;
    const source = "src/cloud-dashboard/cloud-dashboard.html";
    const targetDir = `${dest}/elements/cloud-dashboard`;
    const bundleCmd = `node ${bundler} ${flags} ${source} | node ${crisper} --html ${targetDir}/cloud-dashboard.html --js ${targetDir}/cloud-dashboard.js`;

    function doIt() {
        return Promise.all([
            copyFiles(appDir, dest, ["assets"]),
            copy(
                `${appDir}/bower_components/webcomponentsjs/webcomponents-lite.js`,
                `${dest}/elements/webcomponents-lite.js`
            ),
            pexec(bundleCmd)
        ]).catch(() => {});
    }

    if (watch) {
        fs.watch("app", { recursive: true }, doIt);
    }

    return Promise.resolve()
        // rmdir(dest)
        .then(() => fs.ensureDir(targetDir))
        .then(() => doIt());

}

module.exports = {
    compileCore,
    compileTests,
    compile,
    bundle,
    buildChrome,
    buildElectron,
    buildCordova,
    buildDashboard
};
