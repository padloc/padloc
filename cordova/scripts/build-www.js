/* eslint-env node */

"use strict";

var tools = require("../../tools.js");
var path = require("path");

module.exports = function(context) {
    tools.deploy(path.resolve(context.opts.projectRoot, "www"));
};
