const { createHash } = require("crypto");

function firefoxWebAuthnOrigin(id) {
    if (!id) throw new Error("Provide the same add-on ID as PL_WEB_EXTENSION_FIREFOX_ID");
    // Firefox encodes each hex nibble of SHA-256 as a letter from a to p.
    const hash = createHash("sha256").update(id).digest("hex");
    return `moz-extension://${[...hash].map((digit) => String.fromCharCode(97 + parseInt(digit, 16))).join("")}`;
}

if (require.main === module) {
    console.log(firefoxWebAuthnOrigin(process.argv[2]));
}
module.exports = { firefoxWebAuthnOrigin };
