"use strict";

const { Analyzer, FSUrlLoader } = require("polymer-analyzer");
const { traverse } = require("estraverse");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

let analyzer = new Analyzer({
    urlLoader: new FSUrlLoader("app"),
});

function extractFromExpressions(analysis, funcName) {
    const locStrings = [];

    const domModules = analysis.getFeatures({
        kind: "dom-module",
        imported: true,
        externalPackages: true
    });

    for (const domModule of domModules) {

        for (const databinding of domModule.databindings) {
            if (databinding.properties.length < 1) {
                continue;
            }

            if (databinding.properties[0].name !== funcName) {
                continue;
            }

            const expr = databinding._expressionAst.body[0].expression;

            if (expr.type !== "CallExpression" || !expr.arguments.length) {
                continue;
            }

            const arg = expr.arguments[0];

            if (arg.type !== "Literal") {
                continue;
            }

            locStrings.push(arg.value);
        }
    }

    return locStrings;
}

function evalStringExpression(expr) {
    switch (expr.type) {
        case "Literal":
            return expr.value;
        case "TemplateLiteral":
            if (expr.expressions.length) {
                break;
            }
            return expr.quasis[0].value.raw;
        case "BinaryExpression":
            if (expr.operator !== "+") {
                break;
            }
            return evalStringExpression(expr.left) + evalStringExpression(expr.right);
    }

    throw {
        message: "Can't statically evaluate expression to string",
        expression: expr
    };
}

function extractFromFunctionCalls(analysis, funcName) {
    const jsDocuments = analysis.getFeatures({
        kind: "js-document",
        imported: true,
        externalPackages: true
    });
    const locStrings = [];

    for (const doc of jsDocuments) {
        traverse(doc.parsedDocument.ast, {
            enter(node) {
                if (
                    node.type === "CallExpression" &&
                    (
                        node.callee.type === "Identifier" && node.callee.name === funcName ||
                        node.callee.type === "MemberExpression" &&
                        node.callee.object.type === "ThisExpression" &&
                        node.callee.property.name === funcName
                    )
                ) {
                    try {
                        locStrings.push(evalStringExpression(node.arguments[0]));
                    } catch (e) {
                        const l = doc.parsedDocument.sourceRangeForNode(e.expression);
                        console.warn(`${e.message} (${l.file}, ${l.start.line}:${l.start.column})`);
                    }
                }
            }
        });
    }

    return locStrings;
}

function extract(srcRoot, funcName) {
    return analyzer.analyze([srcRoot]).then((analysis) => {
        for (const w of analysis.getWarnings()) {
            if (w.code === "invalid-polymer-expression") {
                console.warn(`${w.message} ` +
                    `(${w.sourceRange.file},${w.sourceRange.start.line}:${w.sourceRange.start.column})`);
            }
        }
        const fromExpressions = extractFromExpressions(analysis, funcName);
        const fromFunctionCalls = extractFromFunctionCalls(analysis, funcName);
        const strings = fromExpressions.concat(fromFunctionCalls);
        return strings;
    });
}

function loadLanguageFile(path) {
    let data;
    try {
        data = fs.readFileSync(path, "utf8");
    } catch (e) {
        data = "";
    }

    let messages = [];
    try {
        messages = yaml.safeLoad(data) || [];
    } catch (e) {
        console.error(`Failed to parse language file ${path}: ${e.message}`);
    }

    const dict = {};

    for (const m of messages) {
        dict[m.o] = m.t;
    }

    return dict;
}

function saveLanguageFile(path, dict) {
    const translations = Object.entries(dict).map((e) => { return { o: e[0], t: e[1] }; });
    fs.writeFileSync(path, yaml.safeDump(translations), "utf8");
}

function updateLanguageFile(targetDir, lang, messages) {
    const langFile = path.join(targetDir, lang + ".yaml");
    const oldLangFile = path.join(targetDir, lang + "_old.yaml");

    const current = loadLanguageFile(langFile);
    const old = loadLanguageFile(oldLangFile);
    Object.assign(old, current);
    const updated = {};

    for (const m of messages) {
        if (m in old) {
            updated[m] = old[m];
            delete old[m];
        } else if (!(m in updated)) {
            updated[m] = "";
        }
    }

    saveLanguageFile(langFile, updated);
    saveLanguageFile(oldLangFile, old);
}

function updateLanguageFiles(srcRoot = "./index.html", targetDir = "resources/translations",
    languages = ["en", "de"], funcName = "$l") {
    extract(srcRoot, funcName).then((messages) => {
        for (const lang of languages) {
            updateLanguageFile(targetDir, lang, messages);
        }
    });
}

function buildTranslationsFile(srcDir = "resources/translations", dest = "translations.js", languages = ["en", "de"]) {
    const translations = {};

    for (const lang of languages) {
        translations[lang] = loadLanguageFile(path.join(srcDir, lang + ".yaml"));
    }

    const content = `$l.loadTranslations(${JSON.stringify(translations)});`;

    fs.writeFileSync(dest, content, "utf8");
}

module.exports = {
    updateLanguageFiles,
    buildTranslationsFile
};
