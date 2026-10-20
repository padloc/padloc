const { spawn } = require("child_process");
const { resolve } = require("path");

const executable = process.argv[2];
if (!executable) throw new Error("Usage: node test/launch.js <native-executable>");
const child = spawn(resolve(executable), [], { stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (data) => (output += data));
child.stderr.on("data", (data) => (output += data));
let stoppedByTest = false;
const timer = setTimeout(() => {
    stoppedByTest = true;
    child.kill();
}, 10000);
child.on("error", (error) => {
    clearTimeout(timer);
    console.error(error);
    process.exitCode = 1;
});
child.on("exit", (code, signal) => {
    clearTimeout(timer);
    if (!stoppedByTest) {
        console.error(`App exited before the startup smoke test completed (${code || signal}).\n${output}`);
        process.exitCode = 1;
    } else {
        console.log("Native app stayed running for the startup smoke test.");
    }
});
