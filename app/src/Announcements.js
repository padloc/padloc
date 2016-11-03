/* global padlock */

padlock.Announcements = (function() {
    "use strict";

    var sourceKey = "read_announcments";

    function Announcements(url, source) {
        this.url = url;
        this.source = source;
    }

    Announcements.prototype.fetchRead = function(cb) {
        this.source.fetch({
            key: sourceKey,
            success: function(data) {
                cb(JSON.parse(data || "{}"));
            }
        });
    };

    Announcements.prototype.saveRead = function(read) {
        this.source.save({
            key: sourceKey,
            data: JSON.stringify(read)
        });
    };

    Announcements.prototype.parseAndFilter = function(str, cb) {
        var now = new Date();
        try {
            var aa = JSON.parse(str);
        } catch (e) {
            return;
        }

        this.fetchRead(function(read) {
            cb(aa.filter(function(a) {
                var from = a.from ? new Date(a.from) : new Date(0);
                var until = a.until ? new Date(a.until) : new Date(1e13);
                return !read[a.id] && from <= now && until >= now;
            }));
        }.bind(this));
    };

    Announcements.prototype.fetch = function(cb) {
        var req = new XMLHttpRequest();
        var url = this.url;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                this.parseAndFilter(req.responseText, cb);
            }
        }.bind(this);

        try {
            req.open("GET", url, true);
            req.setRequestHeader("Accept", "application/json");
            req.send();
            return req;
        } catch (e) {
            return null;
        }
    };

    Announcements.prototype.markRead = function(a) {
        this.fetchRead(function(read) {
            read[a.id] = true;
            this.saveRead(read);
        }.bind(this));
    };

    return Announcements;
})(padlock.Source);
