const { resolve } = require("path");
const fs = require("fs");

const colorsAndroidFile = resolve(__dirname, "res/android/colors.xml");
const themesAndroidFile = resolve(__dirname, "res/android/themes.xml");
const resAndroidDirectory = resolve(__dirname, "platforms/android/app/src/main/res/values");

async function main() {
    if (!fs.existsSync(resAndroidDirectory)) {
        fs.mkdirSync(resAndroidDirectory, { recursive: true });
    }

    fs.copyFileSync(colorsAndroidFile, resolve(resAndroidDirectory, "colors.xml"));
    fs.copyFileSync(themesAndroidFile, resolve(resAndroidDirectory, "themes.xml"));
}

main();
