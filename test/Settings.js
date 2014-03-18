define(["padlock/Settings"], function(Settings) {
    module("padlock/Settings");

    test("Set/get settings", function() {
        var settings = new Settings();
        settings.set("setting_1", "some value");

        equal(settings.get("setting_1"), "some value", "Once a setting has been set, it should be retrieveable via the get method");
        equal(settings.get("setting_2"), undefined, "Trying to get an unset setting should return undefined");
    });

    test("Default settings", function() {
        var settings = new Settings(null, {
            setting_1: "default 1",
            setting_2: "default 2"
        });
        settings.set("setting_1", "some value");

        equal(settings.get("setting_1"), "some value", "If a setting has been set, it should be return instead of the default value");
        equal(settings.get("setting_2"), "default 2", "If a setting has not been set, the default value should be return if there is one");
    });

    asyncTest("save/fetch settings", function() {
        expect(1);

        var mockSource = {
            save: function(opts) {
                this.data = opts.data;
                opts.success();
            },
            fetch: function(opts) {
                opts.success(this.data);
            }
        };

        var settings = new Settings(mockSource);

        settings.set("setting_1", "some value");
        settings.save({success: function() {
            settings = new Settings(mockSource);
            settings.fetch({success: function() {
                equal(settings.get("setting_1"), "some value", "The settings object should contain the saved setting with the correct value");
                start();
            }});
        }});
    });
});