const path = require("node:path"),
    webpack = require("webpack"),
    HtmlWebpackPlugin = require("html-webpack-plugin");
const target = process.argv[2],
    runtime = process.argv[3];
if (!target || !path.isAbsolute(target) || !["cordova", "tauri"].includes(runtime))
    throw new Error("Pass absolute output directory and cordova/tauri");
const base = require("../../webpack.config.js");
const config = {
    ...base,
    mode: "development",
    entry: path.join(__dirname, "encrypted.ts"),
    output: { ...base.output, path: target, publicPath: "" },
    plugins: [
        ...base.plugins.filter((p) => p.constructor.name !== "HtmlWebpackPlugin"),
        new HtmlWebpackPlugin({
            templateContent: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{font:18px system-ui;padding:70px 20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:15px;margin:8px}</style><h1>Encrypted migration fixture</h1><p>Offline synthetic data only.</p><button id="seed">Seed encrypted fixture</button><button id="verify">Verify unlock and edits</button><pre id="status">Starting…</pre>${
                runtime === "cordova" ? '<script src="cordova.js"></script>' : ""
            }`,
        }),
    ],
};
webpack(config, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({ all: false, errors: true }));
        process.exitCode = 1;
    } else console.log("Built encrypted " + runtime + " fixture");
});
