/* eslint-env node */

"use strict";

var path = require("path");
var fs = require("fs");

module.exports = function(context) {
    var configPath = path.resolve(context.opts.projectRoot, "config.xml");

    // Check if original exists. If not, abort
    try {
        fs.accessSync(configPath + ".orig", fs.F_OK);
    } catch (e) {
        return;
    }

    // Remove existing config.xml, replace with original
    fs.unlinkSync(configPath);
    fs.renameSync(
        configPath + ".orig",
        configPath
    );
};
