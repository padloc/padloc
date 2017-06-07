/* eslint-env node */

"use strict";

var { buildCordova } = require("../../lib/build");
var path = require("path");

module.exports = function(context) {
    return buildCordova(path.resolve(context.opts.projectRoot, "www"));
};
