"use strict";

const { Analyzer, FSUrlLoader } = require("polymer-analyzer");
const { traverse } = require("estraverse");
const yaml = require("js-yaml");

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
            if (!databinding.properties.length) {
                continue;
            }

            // If there's more than one property, then this must be a method call,
            // and the first property must be the method name.
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

function extract(rootFile = "./index.html", funcName = "$l") {
    return analyzer.analyze([rootFile]).then((analysis) => {
        const fromExpressions = extractFromExpressions(analysis, funcName);
        const fromFunctionCalls = extractFromFunctionCalls(analysis, funcName);
        const strings = fromExpressions.concat(fromFunctionCalls);
        return strings;
    });
}
