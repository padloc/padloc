/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior, platform) {
    "use strict";

    Polymer({
        is: "padlock-list-view",
        behaviors: [ViewBehavior, MarkableBehavior],
        properties: {
            filterString: {
                type: String,
                value: ""
            },
            selected: Object,
            records: Array
        },
        observers: [
            "_refresh(filterString)"
        ],
        _firstInSection: {},
        ready: function() {
            this.leftHeaderIcon = "menu";
            this.rightHeaderIcon = "plus";
            this.showFilter = true;
            this._itemSelector = ".record-item";

            // On iOS the keyboard overlays the web view so we have to add some padding to the bottom to
            // make sure all records can be scrolled to.
            if (platform.isIOS()) {
                window.addEventListener("native.keyboardshow", function(e) {
                    this.style.paddingBottom = (e.keyboardHeight + 5) + "px";
                }.bind(this));
                window.addEventListener("native.keyboardhide", function() {
                    this.style.paddingBottom = "";
                }.bind(this));
            }
        },
        leftHeaderButton: function() {
            this.fire("menu");
        },
        rightHeaderButton: function() {
            this.add();
        },
        show: function() {
            this._marked = -1;
            ViewBehavior.show.apply(this, arguments);
        },
        add: function() {
            this.fire("add");
        },
        _filterBySearchString: function(rec) {
            var fs = this.filterString && this.filterString.toLowerCase(),
                words = fs && fs.split(" ") || [];

            // For the record to be a match, each word in the filter string has to appear
            // in either the category or the record name.
            for (var i=0, match=true; i<words.length && match; i++) {
                match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
                    rec.name.toLowerCase().search(words[i]) != -1;
            }

            return !!match;
        },
        _filter: function(rec) {
            var include = !rec.removed && this._filterBySearchString(rec);

            if (include) {
                var section = this._section(rec.name);
                var firstInSection = this._firstInSection[section];

                if (!firstInSection || !this._filterBySearchString(firstInSection) ||
                        this._sort(firstInSection, rec) > 0) {
                    this._firstInSection[section] = rec;
                }
            }

            return include;
        },
        _sort: function(a, b) {
            var secA = this._section(a.name);
            var secB = this._section(b.name);

            if (secA > secB) {
                return 1;
            } else if (secA < secB) {
                return -1;
            } else {
                if (a.name > b.name) {
                    return 1;
                } else if (a.name < b.name) {
                    return -1;
                } else {
                    return a.uuid < b.uuid ? -1 : 1;
                }
            }
        },
        _recordTapped: function(e) {
            this._marked = e.model.index;
            this.fire("select", {record: e.model.item});
        },
        _import: function() {
            this.fire("import");
        },
        _synchronize: function() {
            this.fire("synchronize");
        },
        selectMarked: function() {
            var item = this.$.list.itemForElement(this._items()[this._marked]);
            if (item) {
                this.fire("select", {record: item});
            }
        },
        _section: function(name) {
            return (name || "").toUpperCase()[0];
        },
        _showSectionHeader: function(record) {
            var section = this._section(record.name);
            return this._firstInSection[section] == record;
        },
        _isEmpty: function() {
            return !this.records.filter(function(rec) {
                return !rec.removed;
            }).length;
        },
        _filtered: function() {
            return this.records.filter(this._filter.bind(this)).sort(this._sort.bind(this));
        },
        _refresh: function() {
            this._cachedItems = null;
            this.$.list.render();
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior, padlock.platform);
