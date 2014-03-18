window.addEventListener("polymer-ready", function() {
    require([
        "padlock/LocalStorageSource",
        "padlock/CloudSource",
        "padlock/Store",
        "padlock/Collection",
        "padlock/Categories",
        "padlock/Settings"
    ], function(LocalStorageSource, CloudSource, Store, Collection, Categories, Settings) {

        var source = new LocalStorageSource(),
            store = new Store(source),
            settings = new Settings(source, {
                sync_host: "http://localhost:3000"
            }),
            categories = new Categories(null, 3, source),
            collection = new Collection("default", store);

        var app = new Padlock();
        app.init(collection, settings, categories);

        document.body.appendChild(app);
    }.bind(this));
});