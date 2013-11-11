define(["safe/crypto", "safe/util"], function(crypto, util) {
    var record = Object.create({}, {
        name: {
            enumerable: true,
            value: ""
        },
        fields: {
            enumerable: true,
            value: []
        },
    });

    var collection = Object.create({}, {
        name: {
            writable: true,
            enumerable: true,
            value: "default"
        },
        store: {
            writable: true,
            value: null
        },
        records: {
            writable: true,
            enumerable: true,
            value: []
        },
        parse: {
            value: function(obj) {
                this.records = obj.records;
            }
        },
        raw: {
            value: function() {
                return {
                    name: this.name,
                    records: this.records
                };
            }
        },
        fetch: {
            value: function() {
                this.store.fetch(this);
            }
        },
        save: {
            value: function() {
                this.store.save(this);
            }
        },
        add: {
            value: function(rec, at) {
                this.records = util.insert(this.records, rec, at);
            }
        },
        remove: {
            value: function(rec) {
                var index = this.records.indexOf(rec);
                if (index != -1) {
                    this.removeAt(index);
                }
            }
        },
        removeAt: {
            value: function(from, to) {
                util.remove(this.records, from, to);
            }
        }
    });

    var store = Object.create({}, {
        fetch: {
            value: function(coll) {
                var json = localStorage.getItem("coll_" + coll.name) || "{}";
                return coll.parse(JSON.parse(json));
            }
        },
        save: {
            value: function(coll) {
                var json = JSON.stringify(coll.raw());
                localStorage.setItem("coll_" + coll.name, json);
            }
        }
    });

    return {
        record: record,
        collection: collection,
        store: store
    };
});