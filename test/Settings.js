(function(Settings) {
    module("padlock/Settings");

    var mockStore = {
        save: function(key, data, opts) {
            this.data = data;
            opts.success();
        },
        fetch: function(key, opts) {
            opts.success(this.data);
        }
    };

    test("override default values", function() {
        var settings = new Settings(mockStore, {auto_lock: false});

        equal(settings.auto_lock, false);
    });

    asyncTest("save/fetch settings", function() {
        expect(1);

        var settings = new Settings(mockStore);

        settings.auto_lock = false;
        settings.save({success: function() {
            settings = new Settings(mockStore);
            settings.fetch({success: function() {
                equal(settings.auto_lock, false, "Saved setting should persist");
                start();
            }});
        }});
    });
})(padlock.Settings);
