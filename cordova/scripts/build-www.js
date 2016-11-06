/* eslint-env node */

"use strict";

var { build } = require("../../lib/build");
var path = require("path");

module.exports = function(context) {
    build(path.resolve(context.opts.projectRoot, "www"));
};
