define(["padlock/Settings"], function(Settings) {
    module("padlock/Settings");

    test("Set/get settings", function() {
        var settings = new Settings({setting_2: "default"});
        settings.set("setting_1", "some value");

        equal(settings.get("setting_1"), "some value", "Once a setting has been set, it should be retrieveable via the get method");
        equal(settings.get("setting_2"), "default", "If a setting has not been set, the default value should be return if there is one");
        equal(settings.get("setting_3"), undefined, "Trying to get an unset setting should return undefined");
    });

    test("Predefined settings", function() {
        var settings = new Settings({setting_1: "default"});

        ok(settings.hasOwnProperty("setting_1"), "A property should have been defined for the predefined property");
        equal(settings.setting_1, "default", "The property should have the default value initially");

        settings.setting_1 = "some value";
        equal(settings.setting_1, "some value", "The property should be settable");
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

        var settings = new Settings({setting_1: ""}, mockSource);

        settings.setting_1 = "some value";
        settings.save({success: function() {
            settings = new Settings({setting_1: ""}, mockSource);
            settings.fetch({success: function() {
                equal(settings.setting_1, "some value", "The settings object should contain the saved setting with the correct value");
                start();
            }});
        }});
    });
});