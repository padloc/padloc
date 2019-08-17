import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import * as ts from "typescript";
import * as YAML from "yaml";

function parseExpression(expr: ts.Expression): string {
    switch (expr.kind) {
        case ts.SyntaxKind.StringLiteral:
            return (expr as ts.StringLiteral).text;
        case ts.SyntaxKind.BinaryExpression:
            const bin = expr as ts.BinaryExpression;
            return parseExpression(bin.left) + parseExpression(bin.right);
        default:
            return "";
    }
}

export interface ItemSource {
    file: string;
    line: number;
    character: number;
    comment?: string;
}

export interface TranslationItem {
    original: string;
    translation: string;
    sources: ItemSource[];
}

export interface Translation {
    language: string;
    commit: string;
    date: Date;
    items: TranslationItem[];
}

function extract(files: ts.SourceFile[]) {
    const items = new Map<string, TranslationItem>();

    function traverseFile(file: ts.SourceFile) {
        function traverseNode(node: ts.Node) {
            if (node.kind === ts.SyntaxKind.CallExpression) {
                const call = node as ts.CallExpression;
                if ((call.expression as ts.Identifier).escapedText === "$l") {
                    const fileText = file.getText();
                    const { line, character } = file.getLineAndCharacterOfPosition(call.getFullStart());
                    const keyExpr = call.arguments[0];
                    const original = parseExpression(keyExpr);

                    if (original) {
                        if (!items.has(original)) {
                            items.set(original, {
                                original,
                                translation: "",
                                sources: []
                            });
                        }

                        const item = items.get(original)!;

                        const source: ItemSource = {
                            file: file.fileName,
                            line,
                            character
                        };

                        const comments =
                            ts.getLeadingCommentRanges(fileText, keyExpr.getFullStart()) ||
                            ts.getTrailingCommentRanges(fileText, keyExpr.getFullStart());

                        if (comments && comments.length) {
                            const rawComment = fileText.substring(comments[0].pos, comments[0].end);
                            const matchComment = rawComment.match(/@tcomment: ([^\*\n]+)/);
                            if (matchComment && matchComment[1]) {
                                source.comment = matchComment[1].trim();
                            }
                        }

                        item.sources.push(source);

                        return;
                    }
                }
            }

            ts.forEachChild(node, traverseNode);
        }

        traverseNode(file);
    }

    files.forEach(traverseFile);

    return [...items.values()];
}

export function toYAML({ language, date, commit, items }: Translation) {
    const doc = new YAML.Document();
    doc.commentBefore = `
 Padloc Translation File

 language: ${language}
 date: ${date.toISOString()}
 commit: ${commit}
`;

    doc.contents = YAML.createNode(items.flatMap(item => [item.original, item.translation])) as any;

    for (const [i, item] of items.entries()) {
        const node = (doc.contents as any).items[i*2];
        node.commentBefore = item.sources
            .map(
                ({ file, line, character, comment }) => ` ${file}:${line},${character}${comment ? ` (${comment})` : ""}`
            )
            .join("\n");
        (node as any).spaceBefore = true;
    }

    return doc.toString();
}

export function fromYAML(str: string, language: string): Translation {
    const raw = YAML.parse(str) as string[];
    const items: TranslationItem[] = [];
    for (let i = 0; i < raw.length; i+=2) {
        items.push({original: raw[i], translation: raw[i+1], sources: []});
    }
    return {
        language,
        date: new Date(),
        commit: "",
        items
    };
}

export function toModule(translation: Translation) {
    return `\
    import { parse } from "yaml";
    export default parse(\`
${toYAML(translation)}
    \`);
`;
}

export function toJSON(translation: Translation) {
    return JSON.stringify(translation.items.map(({original, translation}) => [original, translation]), null, 2);
}

export function fromJSON(str: string, language: string) {
    const items = JSON.parse(str).map(([original, translation]: [string, string]) => ({
        original,
        translation,
        sources: []
    }));
    return {
        language,
        date: new Date(),
        commit: "",
        items
    };
}

export function fromSource(fileNames: string[], language: string): Translation {
    const files = fileNames.map(path =>
        ts.createSourceFile(path, readFileSync(resolve(path), "utf8"), ts.ScriptTarget.ES2017, false)
    );

    const commit = execSync("git rev-parse HEAD")
        .toString()
        .trim();
    const items = extract(files);

    return {
        language,
        commit,
        date: new Date(),
        items
    };
}

export function merge(curr: Translation, prev: Translation) {
    for (const item of curr.items) {
        const prevItemIndex = prev.items.findIndex(i => i.original === item.original);
        if (prevItemIndex !== -1) {
            item.translation = prev.items[prevItemIndex].translation;
            prev.items.splice(prevItemIndex, 1);
        }
    }
}

export function updateTranslation(sources: string[], language: string, dest: string) {
    const destPath = resolve(dest, language + ".json");
    const backupPath = resolve(dest, language + "_backup.json");

    const translation = fromSource(sources, language);

    if (existsSync(destPath)) {
        const previous = fromJSON(readFileSync(destPath, "utf-8"), language);
        merge(translation, previous);
        writeFileSync(backupPath, toJSON(previous));
    }

    writeFileSync(destPath, toJSON(translation));
}

const [, , ...fileNames] = process.argv;

updateTranslation(fileNames, "de", resolve(__dirname, "../res/translations/"));
