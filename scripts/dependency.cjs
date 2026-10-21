const { spawnSync } = require("node:child_process");
const [action, workspace, ...packages] = process.argv.slice(2);
if (!workspace || !packages.length || !["add", "remove"].includes(action)) {
    throw new Error("Usage: npm run add|remove -- <workspace> <package...>");
}
const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    [action === "add" ? "install" : "uninstall", "--workspace", workspace, ...packages, "--save-exact"],
    { stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(result.status ?? 1);
