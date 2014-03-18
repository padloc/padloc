QUnit.config.autostart = false;

require([
    "test/util",
    "test/crypto",
    "test/import",
    "test/Collection",
    "test/Categories",
    "test/Settings"
], function() {
    QUnit.start();
});