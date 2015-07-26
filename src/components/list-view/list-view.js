/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-list-view",
        behaviors: [ViewBehavior],
        properties: {
            collection: Object,
            filterString: String,
            selected: {
                type: Object,
                notify: true
            },
            categories: Object,
            marked: Object,
            settings: Object,
            _records: Array,
            _filteredRecords: {
                type: Array,
                value: function() {
                    return [];
                }
            },
            _empty: Boolean
        },
        observers: [
            "prepareRecords(collection.records, filterString, settings.order_by)"
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
        bufferedPrepareRecords: function() {
            if (this.prepareRecordsTimeout) {
                clearTimeout(this.prepareRecordsTimeout);
            }
            this.prepareRecordsTimeout = setTimeout(this.prepareRecords.bind(this), 300);
        },
        prepareRecords: function() {
            if (!this.collection) {
                return;
            }

            this.marked = null;

            var fs = this.filterString && this.filterString.toLowerCase(),
                words = fs && fs.split(" ") || [],
                records = this.collection.records.filter(function(rec) {
                    return !rec.removed;
                }),
                count = records.length;

            // Set up category and section property
            records.forEach(function(rec) {
                // Add the records category to known categories and assign it a color if it doesn't exist yet.
                // This is done here mainly for efficiency reasons.
                if (rec.category && !this.categories.get(rec.category)) {
                    this.categories.set(rec.category, this.categories.autoColor());
                }

                // Give it a section property for the rendering of the section headers
                rec.section = this.settings.order_by == "category" ?
                    rec.category || "other" : rec.name.toUpperCase()[0];

                // Add properties for rendering the category
                rec.catColor = this.categories.get(rec.category) || "";
                rec.showCategory = this.settings.order_by != "category";
            }.bind(this));

            // Save the categories in case any new ones have been added
            this.categories.save();

            // Sort by section first, name second
            records.sort(function(a, b) {
                if (a.section > b.section) {
                    return 1;
                } else if (a.section < b.section) {
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
            });

            var prevSection;
            // Add some metadata to each record and do some other preparation work
            records.forEach(function(rec) {
                // For the record to be a match, each word in the filter string has to appear
                // in either the category or the record name.
                for (var i=0, match=true; i<words.length && match; i++) {
                    match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
                        rec.name.toLowerCase().search(words[i]) != -1;
                }
                rec.hidden = !match;

                if (!rec.hidden && rec.section !== prevSection) {
                    rec.firstInSection = true;
                    prevSection = rec.section;
                } else {
                    rec.firstInSection = false;
                }
            }.bind(this));

            // Update records
            this._records = records;
            this._filteredRecords = records.filter(function(rec) {
                return !rec.hidden;
            });
            this._empty = !count;
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
        _categoryClass: function(record, baseClass) {
            return baseClass + " " + (record.showCategory ? "" : "color" + record.catColor);
        }
    });

})(Polymer, padlock.ViewBehavior);
