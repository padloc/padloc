const { getSignVendorPath } = require("app-builder-lib/out/codeSign/windowsCodeSign");
const path = require("path");
const { execSync } = require("child_process");

exports.default = async function(opts) {
    const vendorPath = await getSignVendorPath();
    const signTool = path.join(vendorPath, "windows-10", process.arch, "signtool.exe");

    execSync(
        `${signTool} sign /n "${opts.options.publisherName}" ` + `/t http://time.certum.pl/ /fd sha1 /v "${opts.path}"`
    );

    execSync(
        `${signTool} sign /as /n "${opts.options.publisherName}" ` +
            `/tr http://time.certum.pl/ /fd sha256 /v "${opts.path}"`
    );
};
