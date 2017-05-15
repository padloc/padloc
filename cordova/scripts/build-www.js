/* eslint-env node */

"use strict";

var { buildCordova } = require("../../lib/build");
var path = require("path");

module.exports = function(context) {
    buildCordova(path.resolve(context.opts.projectRoot, "www"));
};
