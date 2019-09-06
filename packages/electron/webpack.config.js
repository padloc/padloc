const path = require("path");
const { EnvironmentPlugin, optimize } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = [
    {
        target: "electron-renderer",
        entry: {
            app: path.resolve(__dirname, "src/index.ts")
        },
        output: {
            path: path.resolve(__dirname, "build"),
            filename: "[name].js",
            chunkFilename: "[name].chunk.js"
        },
        mode: "development",
        devtool: "source-map",
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader"
                },
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"]
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                    use: ["file-loader"]
                }
            ]
        },
        plugins: [
            new EnvironmentPlugin({
                PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
                PL_STRIPE_PUBLIC_KEY: null
            }),
            new HtmlWebpackPlugin({
                title: "Padloc",
                template: path.resolve(__dirname, "src/index.html")
            }),
            new optimize.LimitChunkCountPlugin({
                maxChunks: 1
            })
        ]
    },
    {
        target: "electron-main",
        entry: {
            main: path.resolve(__dirname, "src/main.ts")
        },
        output: {
            path: path.resolve(__dirname, "build"),
            filename: "[name].js",
            chunkFilename: "[name].chunk.js"
        },
        mode: "development",
        devtool: "source-map",
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    loader: "ts-loader"
                }
            ]
        },
        plugins: [
            new EnvironmentPlugin({
                PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
                PL_STRIPE_PUBLIC_KEY: null
            })
        ]
    }
];
