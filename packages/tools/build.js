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
const { getSignVendorPath } = require("electron-builder-lib/out/windowsCodeSign");
const { PolymerProject, getOptimizeStreams, addServiceWorker } = require("polymer-build");
const mergeStream = require("merge-stream");
const { Transform } = require("stream");
const { projectConfig, swConfig } = require("./config");

const projectRoot = path.resolve(__dirname, "..");
const appDir = path.join(projectRoot, "app");

function promisify(f) {
    return function() {
        return new Promise((resolve, reject) => {
            f(...arguments, err => {
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

function copyFiles(source, dest, files) {
    return Promise.all(files.map(f => copy(path.resolve(source, f), path.resolve(dest, f))));
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

function streamToPromise(stream) {
    return new Promise(function(resolve, reject) {
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}

class InjectSWLoader extends Transform {
    constructor(path) {
        super({ objectMode: true });
        this.path = path;
    }

    _transform(file, _, done) {
        if (file.path == path) {
            let contents = file.contents.toString();
            contents = contents.replace(
                /<head>/i,
                `<head>
                    <script>
                        // Register service worker if supported.
                        if ("serviceWorker" in navigator) {
                            window.addEventListener("load", function() {
                                navigator.serviceWorker.register("service-worker.js");
                            });
                        }
                    </script>
                `
            );
            file.contents = new Buffer(contents);
        }
        done(null, file);
    }
}

async function bundle(dest = "build", { bundle, amd, sw, compile }) {
    dest = path.resolve(projectRoot, dest);

    process.chdir(appDir);

    const project = new PolymerProject(projectConfig);
    const entryPoint = path.resolve(appDir, project.config.entrypoint);

    let stream = mergeStream(project.sources(), project.dependencies());

    if (sw) {
        stream = stream.pipe(new InjectSWLoader(entryPoint));
    }

    if (bundle) {
        stream = stream.pipe(project.bundler());
    }

    const optStreams = getOptimizeStreams({
        js: {
            moduleResolution: project.config.moduleResolution,
            transformModulesToAmd: amd,
            compile: compile
        },
        entrypointPath: project.config.entrypoint,
        rootDir: project.config.root
    });

    for (const s of optStreams) {
        stream = stream.pipe(s);
    }

    await rmdir(dest);
    stream = stream.pipe(gulp.dest(dest));

    await streamToPromise(stream);

    if (sw) {
        await addServiceWorker({
            buildRoot: dest,
            project: project,
            swPrecacheConfig: swConfig,
            bundled: false
        });
    }
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
        .then(
            () =>
                new Promise((resolve, reject) => {
                    let output = fs.createWriteStream(path.join(dest, `padlock-v${version}-chrome.zip`));
                    let archive = archiver.create("zip");
                    archive.directory(buildDir, "padlock");
                    archive.on("error", reject);
                    archive.on("finish", resolve);
                    archive.pipe(output);
                    archive.finalize();
                })
        );
}

async function buildElectron(options) {
    const buildDir = path.join("app", "build", "electron");
    const distDir = path.join("dist", "electron");
    const { name, version, description, author, licence, homepage, dependencies, main } = require(path.join(
        projectRoot,
        "package.json"
    ));
    const appMeta = {
        name,
        version,
        description,
        author,
        licence,
        homepage,
        dependencies,
        main,
        productName: "Padlock"
    };

    await pexec("cd ${appDir} && polymer build --name electron --js-compile --bundle --js-transform-modules-to-amd");
    await rmdir(distDir);
    await copy(buildDir, distDir);
    await copy("./main.js", distDir);
    await writeFile(path.join(distDir, "package.json"), JSON.stringify(appMeta, null, "  "));
    await pexec(`cd ${distDir} && npm install --production`);
    await builder.build({
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
                publisherName: "Open Source Developer, Martin Kleinschrodt",
                sign: opts => {
                    return getSignVendorPath().then(vendorPath => {
                        const signTool = path.join(vendorPath, "windows-10", process.arch, "signtool.exe");
                        const cmd =
                            `${signTool} sign /n "${opts.options.publisherName}" ` +
                            `/t http://time.certum.pl/ /fd sha1 /v "${opts.path}"`;

                        return pexec(cmd, true, true);
                    });
                }
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
    });
}

async function buildCordova(platform, dest) {
    await pexec("cd ${appDir} && polymer build --name cordova");
    await copy(path.resolve(appDir, "build", "cordova", dest));

    const stream = gulp
        .src("index.html", { cwd: dest })
        .pipe(
            insertLines({
                after: /<head>/i,
                lineAfter: '\n<script src="cordova.js"></script>\n'
            })
        )
        .pipe(gulp.dest(dest));

    return streamToPromise(stream);
}

function buildDashboard(dest = "build/dashboard", watch = false) {
    const bundler = `${projectRoot}/node_modules/polymer-bundler/lib/bin/polymer-bundler.js`;
    const crisper = `${projectRoot}/node_modules/crisper/bin/crisper`;
    const flags = `--inline-scripts --inline-css -r ${appDir}`;
    const source = "src/cloud-dashboard/cloud-dashboard.html";
    const targetDir = `${dest}/elements/cloud-dashboard`;
    const bundleCmd =
        `node ${bundler} ${flags} ${source} | node ${crisper} --html ` +
        `${targetDir}/cloud-dashboard.html --js ${targetDir}/cloud-dashboard.js`;

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

    return (
        Promise.resolve()
            // rmdir(dest)
            .then(() => fs.ensureDir(targetDir))
            .then(() => doIt())
    );
}

module.exports = {
    bundle,
    buildChrome,
    buildElectron,
    buildCordova,
    buildDashboard
};
