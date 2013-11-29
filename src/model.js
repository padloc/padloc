define(["safe/crypto", "safe/util"], function(crypto, util) {
    var Store = function(password) {
        this.password = "";
    };

    Store.prototype = {
        fetch: function(coll, password) {
            this.password = password || this.password;
            var obj = {};

            var json = localStorage.getItem("coll_" + coll.name);
            if (json) {
                // try {
                    var c = JSON.parse(json);
                    coll.records = JSON.parse(crypto.pwdDecrypt(this.password, c));
                // } catch (e) {
                //     if (e ==)
                // }
            }
            return coll;
        },
        save: function(coll) {
            var pt = JSON.stringify(coll.records);
            var c = crypto.pwdEncrypt(this.password, pt);
            localStorage.setItem("coll_" + coll.name, JSON.stringify(c));
        }
    };

    var Collection = function(name, records, store) {
        this.name = name || "default";
        this.records = records || [];
        this.store = store || new Store();
    };

    Collection.prototype = {
        fetch: function() {
            this.store.fetch(this);
        },
        save: function() {
            this.store.save(this);
        },
        add: function(rec, at) {
            this.records = util.insert(this.records, rec, at !== undefined ? at : this.records.length);
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
        }
    };

    return {
        Store: Store,
        Collection: Collection
    };
});