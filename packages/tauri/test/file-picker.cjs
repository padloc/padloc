const assert = require("node:assert/strict"),
    fs = require("node:fs"),
    path = require("node:path"),
    vm = require("node:vm"),
    ts = require("typescript");
const inputs = [];
const moduleObj = { exports: {} };
vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../app/src/lib/util.ts"), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
        module: moduleObj,
        exports: moduleObj.exports,
        require: (name) =>
            ({
                dompurify: { sanitize: (x) => x },
                lit: { html: () => "" },
                "lit/directives/unsafe-html.js": { unsafeHTML: (x) => x },
            }[name]),
        document: {
            createElement: () => {
                const input = {
                    style: {},
                    handlers: {},
                    addEventListener(name, fn) {
                        this.handlers[name] = fn;
                    },
                    click() {},
                };
                inputs.push(input);
                return input;
            },
            body: { appendChild() {}, removeChild() {} },
        },
    }
);
(async () => {
    const { selectFile } = moduleObj.exports;
    const cancelled = selectFile();
    inputs[0].handlers.cancel();
    assert.equal(await cancelled, null);
    const selected = selectFile();
    const file = { name: "synthetic.csv" };
    inputs[1].files = [file];
    inputs[1].handlers.change();
    assert.equal(await selected, file);
    const empty = selectFile();
    inputs[2].files = [];
    inputs[2].handlers.change();
    assert.equal(await empty, null);
    console.log("File picker: selection, empty selection and cancellation settle correctly");
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
