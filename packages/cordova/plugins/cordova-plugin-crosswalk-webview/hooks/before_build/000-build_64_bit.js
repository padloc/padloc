#!/usr/bin/env node

module.exports = function(context) {

    /** @external */
    var deferral = context.requireCordovaModule('q').defer(),
        UpdateConfig = require('./../update_config.js'),
        updateConfig = new UpdateConfig(context);

    /** Main method */
    var main = function() {
        // Remove the xwalk variables
        updateConfig.beforeBuild64bit();

        deferral.resolve();
    };

    main();

    return deferral.promise;

};
