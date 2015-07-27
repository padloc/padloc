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
            selected: {
                type: Object,
                notify: true,
                observer: "_selectedChanged"
            },
            categories: Object,
            settings: Object,
            records: Array,
            _filteredRecords: {
                type: Array,
                computed: "_filtered(records.*, filterString, settings.order_by)"
            },
            _empty: {
                type: Boolean,
                computed: "_isEmpty(records.length)"
            }
        },
        observers: [
            "_refresh(filterString, settings.order_by)"
        ],
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
        _filter: function(rec) {
            var fs = this.filterString && this.filterString.toLowerCase(),
                words = fs && fs.split(" ") || [];

            if (rec.removed) {
                return false;
            }

            // For the record to be a match, each word in the filter string has to appear
            // in either the category or the record name.
            for (var i=0, match=true; i<words.length && match; i++) {
                match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
                    rec.name.toLowerCase().search(words[i]) != -1;
            }

            return !!match;
        },
        _sort: function(a, b) {
            var secA = this._section(a.name, a.category, this.settings.order_by);
            var secB = this._section(b.name, b.category, this.settings.order_by);

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
                    return 0;
                }
            }
        },
        _recordClicked: function(e) {
            this.selected = e.model.item;
        },
        _import: function() {
            this.fire("import");
        },
        _synchronize: function() {
            this.fire("synchronize");
        },
        selectMarked: function() {
            this.selected = this._filteredRecords[this._marked];
        },
        _selectedChanged: function() {
            var ind = this._filteredRecords.indexOf(this.selected);
            this._marked = ind !== -1 ? ind : null;
        },
        _section: function(name, category, orderBy) {
            return orderBy == "category" ? category || "other" : name.toUpperCase()[0];
        },
        _sectionHeaderClass: function(category, orderBy) {
            var showCategory = this._showCategory(orderBy);
            var colorClass = "color" + (this.categories.get(category) || "");
            return "section-header " + (showCategory ? "" : colorClass);
        },
        _categoryClass: function(category) {
            return "record-item-category color" + (this.categories.get(category) || "");
        },
        _showSectionHeader: function(name, category, orderBy, index) {
            var section = this._section(name, category, orderBy);
            var prevRecord = this._filteredRecords[index - 1];
            var prevSection = prevRecord && this._section(prevRecord.name, prevRecord.category, orderBy);

            return prevSection != section;
        },
        _showCategory: function(orderBy) {
            return orderBy != "category";
        },
        _isEmpty: function(count) {
            return !count;
        },
        _filtered: function() {
            return this.records.filter(this._filter.bind(this)).sort(this._sort.bind(this));
        },
        _refresh: function() {
            this.$.list.render();
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.MarkableBehavior);
