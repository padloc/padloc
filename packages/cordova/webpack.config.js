const path = require("path");
const { EnvironmentPlugin } = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
    entry: path.resolve(__dirname, "src/index.ts"),
    output: {
        path: path.resolve(__dirname, "www"),
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
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "Padloc",
            template: path.resolve(__dirname, "src/index.html")
        })
    ]
};
