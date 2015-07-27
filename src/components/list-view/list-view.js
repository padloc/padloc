/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-list-view",
        behaviors: [ViewBehavior],
        properties: {
            filterString: String,
            selected: {
                type: Object,
                notify: true
            },
            categories: Object,
            marked: Object,
            settings: Object,
            records: Array,
            _filteredRecords: {
                type: Array,
                computed: "_filtered(records.*)"
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

            // For the record to be a match, each word in the filter string has to appear
            // in either the category or the record name.
            for (var i=0, match=true; i<words.length && match; i++) {
                match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
                    rec.name.toLowerCase().search(words[i]) != -1;
            }

            return !!match && !rec.removed;
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
        _recordClicked: function(event, detail, sender) {
            this.selected = sender.templateInstance.model;
        },
        import: function() {
            this.fire("import");
        },
        synchronize: function() {
            this.fire("synchronize");
        },
        markNext: function() {
            var length = this._filteredRecords.length;
            if (length) {
                if (this.marked === null) {
                    this.marked = 0;
                } else {
                    this.marked = (this.marked + 1 + length) % length;
                }
                this.revealMarked();
            }
        },
        markPrev: function() {
            var length = this._filteredRecords.length;
            if (length) {
                if (this.marked === null) {
                    this.marked = length - 1;
                } else {
                    this.marked = (this.marked - 1 + length) % length;
                }
                this.revealMarked();
            }
        },
        markedChanged: function(markedOld, markedNew) {
            var elements = this.shadowRoot.querySelectorAll(".record-item:not([hidden])"),
                oldEl = elements[markedOld],
                newEl = elements[markedNew];

            if (oldEl) {
                oldEl.classList.remove("marked");
            }
            if (newEl) {
                newEl.classList.add("marked");
            }
        },
        revealMarked: function() {
            var elements = this.shadowRoot.querySelectorAll(".record-item:not([hidden])"),
                el = elements[this.marked];

            this.scrollIntoView(el);
        },
        //* Scrolls a given element in the list into view
        scrollIntoView: function(el) {
            if (el.offsetTop < this.scrollTop) {
                // The element is off to the top; Scroll it into view, aligning it at the top
                el.scrollIntoView();
            } else if (el.offsetTop + el.offsetHeight > this.scrollTop + this.offsetHeight) {
                // The element is off to the bottom; Scroll it into view, aligning it at the bottom
                el.scrollIntoView(false);
            }
        },
        selectMarked: function() {
            this.selected = this._filteredRecords[this.marked];
        },
        selectedChanged: function() {
            var ind = this._filteredRecords.indexOf(this.selected);
            this.marked = ind !== -1 ? ind : null;
        },
        _section: function(name, category, orderBy) {
            return orderBy == "category" ? category || "other" : name.toUpperCase()[0];
        },
        _categoryClass: function(category, baseClass) {
            return baseClass + " " + (this.categories.get(category) || "");
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

})(Polymer, padlock.ViewBehavior);
