/* eslint-env node */

"use strict";

var path = require("path");
var fs = require("fs");

module.exports = function(context) {
    var configPath = path.resolve(context.opts.projectRoot, "config.xml");
    var billingKey = process.env.PADLOCK_BILLING_KEY || "";
    var config = fs.readFileSync(configPath, {encoding: "utf-8"});

    fs.renameSync(
        configPath,
        configPath + ".orig"
    );

    fs.writeFileSync(configPath,
        config.replace(
            /<variable name="BILLING_KEY" value="(.*?)" \/>/,
            '<variable name="BILLING_KEY" value="' + billingKey + '" />'
        ));
};
