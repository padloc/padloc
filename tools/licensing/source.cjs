const { execFileSync } = require("node:child_process");
const { root } = require("./notices.cjs");

function sourceInfo() {
    let revision = process.env.PL_SOURCE_REVISION || null;
    let modified = false;
    let checkout;
    try {
        checkout = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        modified = !!execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
            cwd: root,
            encoding: "utf8",
        }).trim();
    } catch {
        /* Source archives and Docker contexts have no .git directory. */
    }
    if (revision && checkout && revision !== checkout)
        throw new Error("PL_SOURCE_REVISION differs from the checked-out commit");
    revision ||= checkout || null;
    if (revision && !/^[a-f0-9]{40}$/.test(revision))
        throw new Error("PL_SOURCE_REVISION must be a full Git commit hash");
    if (process.env.PL_RELEASE_BUILD === "true" && (modified || !revision))
        throw new Error("Release source must be committed before building");
    const sourceUrl =
        process.env.PL_SOURCE_URL ||
        (revision ? `https://github.com/padloc/padloc/archive/${revision}.tar.gz` : "https://github.com/padloc/padloc");
    if (!/^https:\/\//.test(sourceUrl)) throw new Error("PL_SOURCE_URL must be an HTTPS source download URL");
    return { revision, modified, sourceUrl };
}

module.exports = { sourceInfo };
if (require.main === module) process.stdout.write(JSON.stringify(sourceInfo(), null, 4) + "\n");
