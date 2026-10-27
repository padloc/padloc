const webpack = require("webpack");
const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const output = process.argv[2];
if (!output || !path.isAbsolute(output)) {
    throw new Error("Pass an absolute temporary output directory");
}

webpack({
    mode: "development",
    entry: path.join(__dirname, "plugin-smoke.ts"),
    output: { path: output, filename: "main.js" },
    resolve: { extensions: [".ts", ".js"] },
    module: {
        rules: [{
            test: /\.ts$/,
            loader: "ts-loader",
            options: { transpileOnly: true, configFile: path.join(__dirname, "../tsconfig.json") },
        }],
    },
    plugins: [new HtmlWebpackPlugin({
        templateContent: `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
body { font: 18px system-ui; padding: 80px 24px; }
button { padding: 16px; margin: 8px; }
pre { white-space: pre-wrap; }
</style>
<h1>Native plugin smoke test</h1>
<p>Synthetic inputs only. No vault or account data.</p>
<button id="check">Check plugin commands</button>
<button id="share">Open share sheet</button>
<button id="store">Store synthetic biometric key</button>
<button id="read">Read and verify biometric key</button>
<button id="cancel">Check cancelled authentication</button>
<button id="replace">Cancel replacement key</button>
<button id="hold">Hold next privacy resume</button>
<pre id="status">Starting…</pre>`,
    })],
}, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({ all: false, errors: true }));
        process.exitCode = 1;
    } else {
        console.log("Built native plugin smoke harness");
    }
});
