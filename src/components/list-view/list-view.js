/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior, MarkableBehavior) {
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
            categories: Object,
            records: Array,
            _filteredRecords: {
                type: Array,
                computed: "_filtered(records.*, filterString)"
            },
            _empty: {
                type: Boolean,
                computed: "_isEmpty(records.length)"
            }
        },
        observers: [
            "_refresh(filterString)"
        ],
        _firstInSection: {},
        ready: function() {
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "menu";
            this.headerOptions.rightIconShape = "plus";
            this.headerOptions.showFilter = true;
            this._itemSelector = ".record-item";
        },
        leftHeaderButton: function() {
            this.fire("menu");
        },
        rightHeaderButton: function() {
            this.fire("add");
        },
        show: function() {
            this._marked = -1;
            ViewBehavior.show.apply(this, arguments);
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
            this.fire("select", {record: this._filteredRecords[this._marked]});
        },
        _section: function(name) {
            return (name || "").toUpperCase()[0];
        },
        _categoryClass: function(category, baseClass) {
            var colorClass = "color" + (this.categories.get(category) || "");
            return baseClass + " " + colorClass;
        },
        _showSectionHeader: function(record) {
            var section = this._section(record.name);
            return this._firstInSection[section] == record;
        },
        _isEmpty: function(count) {
            return !count;
        },
        _filtered: function() {
            return this.records.filter(this._filter.bind(this)).sort(this._sort.bind(this));
        },
        _refresh: function() {
            this._cachedItems = null;
            this.$.list.render();
        }
        // _domChange: function() {
        //     this._filteredRecords = this._items().map(function(item, index) {
        //         return this.$.list.modelForElement(item).item;
        //     }.bind(this));
        // }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior);
