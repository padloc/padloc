module.exports = {
    globDirectory: ".",
    globPatterns: [
        "index.html",
        "dist/**/*.js",
        "package.json",
        "manifest.json",
        "env.js",
        "manifest.json",
        "node_modules/@webcomponents/webcomponentsjs/**/*",
        "node_modules/@padloc/core/lib/**/*.js",
        "node_modules/@padloc/core/vendor/**/*.js",
        "node_modules/jsqr/dist/jsQR.js",
        "node_modules/reflect-metadata/*.js",
        "node_modules/lit-element/**/*.js",
        "node_modules/lit-html/**/*.js",
        "node_modules/autosize/src/autosize.js",
        "node_modules/jsqr/dist/jsQR.js",
        "node_modules/workbox-sw/build/workbox-sw.js",
        "node_modules/localforage/src/**/*.js",
        "assets/**/*",
        "vendor/**/*",
        "shim/**/*"
    ],
    globIgnores: [],
    swDest: "sw.js",
    swSrc: "dist/sw.js"
};
