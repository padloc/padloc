define(["padlock/crypto", "padlock/util"], function(crypto, util) {
    var Store = function(password) {
        this.password = "";
    };

    Store.prototype = {
        fetch: function(coll, password) {
            password = password !== undefined && password !== null ? password : this.password;
            var obj = {};

            var json = localStorage.getItem("coll_" + coll.name);
            if (json) {
                try {
                    var c = JSON.parse(json);
                    coll.records = JSON.parse(crypto.pwdDecrypt(password, c));
                } catch (e) {
                    return false;
                }
            }
            this.password = password;

            return true;
        },
        save: function(coll) {
            var pt = JSON.stringify(coll.records);
            var c = crypto.pwdEncrypt(this.password, pt);
            localStorage.setItem("coll_" + coll.name, JSON.stringify(c));
        },
        collectionExists: function(collName) {
            return localStorage.getItem("coll_" + collName) !== null;
        }
    };

    var Collection = function(name, records, store) {
        this.name = name || "default";
        this.records = records || [];
        this.store = store || new Store();
    };

    Collection.prototype = {
        fetch: function(password) {
            return this.store.fetch(this, password);
        },
        save: function() {
            this.store.save(this);
        },
        add: function(rec, at) {
            this.records = util.insert(this.records, rec, at !== undefined && at !== null ? at : this.records.length);
        },
        remove: function(rec) {
            var index = this.records.indexOf(rec);
            if (index != -1) {
                this.removeAt(index);
            }
        },
        removeAt: function(from, to) {
            this.records = util.remove(this.records, from, to);
        },
        replace: function(orig, repl) {
            this.records[this.records.indexOf(orig)] = repl;
        },
        setPassword: function(password) {
            this.store.password = password;
            this.save();
        },
        exists: function() {
            return this.store.collectionExists(this.name);
        },
        lock: function() {
            this.records = [];
            this.store.password = null;
        }
    };

    return {
        Store: Store,
        Collection: Collection
    };
});