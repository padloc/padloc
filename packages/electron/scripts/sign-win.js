const path = require("path");
const { execSync } = require("child_process");
const { tmpdir } = require("os");
const { writeFileSync, unlinkSync } = require("fs");

exports.default = async function(opts) {
    const jsign = path.resolve(__dirname, "jsign-2.1.jar");
    const pass = process.env.PL_WIN_SIGN_PASS;
    const lib = path.resolve(__dirname, "crypto3PKCS.dylib");
    const keystore = path.join(tmpdir(), "pl-keystore.cfg");

    writeFileSync(
        keystore,
        `name=Crypto3CSP
library=${lib}
slot=-1
slotListIndex=0`
    );

    execSync(
        `java -jar ${jsign} --keystore ${keystore} --storepass ${pass} --storetype PKCS11 -t http://time.certum.pl/ -a "${
            opts.options.publisherName
        }" "${opts.path}"`
    );

    unlinkSync(keystore);
};
