const path = require("path");
const { EnvironmentPlugin } = require("webpack");
const { InjectManifest } = require("workbox-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");

module.exports = {
    entry: path.resolve("src/elements/app.ts"),
    output: {
        path: path.resolve("dist"),
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
            },
            {
                test: /env.js$/,
                use: ["file-loader"]
            }
        ]
    },
    plugins: [
        new EnvironmentPlugin({
            PL_SERVER_URL: `http://localhost:${process.env.PL_SERVER_PORT || 3000}`,
            PL_STRIPE_PUBLIC_KEY: null
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "Padloc",
            template: path.resolve("index.html")
        }),
        new FaviconsWebpackPlugin(path.resolve("assets/icons/512.png")),
        new WebpackPwaManifest({
            name: "Padloc Password Manager",
            short_name: "Padloc",
            background_color: "#59c6ff",
            theme: "#59c6ff",
            icons: [
                {
                    src: path.resolve("assets/icons/512.png"),
                    sizes: [96, 128, 192, 256, 384, 512]
                }
            ]
        }),
        new InjectManifest({
            swSrc: path.resolve("src/sw.ts"),
            swDest: "sw.js"
        })
    ],
    devServer: {
        contentBase: "./dist",
        historyApiFallback: true,
        host: "0.0.0.0",
        port: process.env.PL_CLIENT_PORT || 8080
    },
    node: {
        fs: "empty",
        net: "empty",
        tls: "empty"
    }
};
