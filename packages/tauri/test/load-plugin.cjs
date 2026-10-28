// Exercise local plugin guest bindings using the same mocked IPC as the adapter.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

module.exports = (name, dependencies, globals = {}) => {
    const module = { exports: {} };
    const filename = path.resolve(__dirname, "../src", name, "index.ts");
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(source, {
        module,
        exports: module.exports,
        require: (name) => {
            if (!(name in dependencies)) throw new Error("Unexpected plugin dependency " + name);
            return dependencies[name];
        },
        ...globals,
    });
    return module.exports;
};
