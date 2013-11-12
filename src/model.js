define(["safe/crypto", "safe/util"], function(crypto, util) {
    var store = Object.create({}, {
        password: {
            value: "", writable: true
        },
        fetch: {
            value: function(coll, password) {
                this.password = password || this.password;
                var obj = {};

                var json = localStorage.getItem("coll_" + coll.name);
                if (json) {
                    try {
                        var c = JSON.parse(json);
                        obj.records = crypto.pwdDecrypt(this.password, c);
                    } catch (e) {
                        console.error("*** failed decrypting! ***", e);
                    }
                }
                return coll.parse(obj);
            }
        },
        save: {
            value: function(coll) {
                var pt = JSON.stringify(coll.raw());
                var c = crypto.pwdEncrypt(this.password, pt);
                localStorage.setItem("coll_" + coll.name, JSON.stringify(c));
            }
        }
    });

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
            value: store
        },
        records: {
            writable: true,
            enumerable: true,
            value: []
        },
        parse: {
            value: function(obj) {
                this.records = obj.records || [];
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

    return {
        record: record,
        collection: collection,
        store: store
    };
});