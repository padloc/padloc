window.addEventListener("polymer-ready", function() {
    require([
        "padlock/LocalSource",
        "padlock/CloudSource",
        "padlock/Store",
        "padlock/Collection",
        "padlock/Categories",
        "padlock/Settings",
        // These are included just for preloading
        "padlock/platform"
    ], function(LocalSource, CloudSource, Store, Collection, Categories, Settings) {
        var source = new LocalSource(),
            store = new Store(source),
            cloudHost = "https://cloud.padlock.io/",
            settings = new Settings({
                sync_host: cloudHost,
                sync_email: "",
                sync_key: "",
                sync_device: "",
                sync_connected: false,
                sync_auto: true,
                default_fields: ["username", "password"],
                order_by: "name"
            }, source),
            categories = new Categories(null, 3, source),
            collection = new Collection("default", store);

        var app = new Padlock();
        app.init(collection, settings, categories);

        document.body.appendChild(app);
    }.bind(this));
});