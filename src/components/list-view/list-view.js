/* jshint browser: true */
/* global Polymer, PadlockView */

(function(Polymer) {
    "use strict";

    Polymer("padlock-list-view", {
        headerOptions: {
            show: true,
            leftIconShape: "menu",
            rightIconShape: "plus",
            showFilter: true
        },
        observe: {
            filterString: "prepareRecords",
            "collection.records": "prepareRecords",
            "settings.order_by": "prepareRecords"
        },
        marked: null,
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

            var fs = this.filterString && this.filterString.toLowerCase(),
                words = fs.split(" "),
                records = this.collection.records.filter(function(rec) {
                    return !rec.removed;
                }),
                count = records.length;

            // Sort by section property first, name second
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

            function filter(rec) {   
                if (!fs) {
                    return true;
                }
                // For the record to be a match, each word in the filter string has to appear
                // in either the category or the record name.
                for (var i=0, match=true; i<words.length && match; i++) {
                    match = rec.category && rec.category.toLowerCase().search(words[i]) != -1 ||
                        rec.name.toLowerCase().search(words[i]) != -1;
                }
                return match;
            }

            var prevSection;
            // Add some metadata to each record and do some other preparation work
            records.forEach(function(rec) {
                if (!filter(rec)) {
                    rec.hidden = true;
                    return;
                } else {
                    delete rec.hidden;
                }

                // Add the records category to known categories and assign it a color if it doesn't exist yet.
                // This is done here mainly for efficiency reasons.
                if (rec.category && !this.categories.get(rec.category)) {
                    this.categories.set(rec.category, this.categories.autoColor());
                }

                // Give it a section property for the rendering of the section headers
                rec.section = this.settings.order_by == "category" ?
                    rec.category || "other" : rec.name.toUpperCase()[0];

                if (rec.section !== prevSection) {
                    rec.firstInSection = true;
                    prevSection = rec.section;
                } else {
                    rec.firstInSection = false;
                }

                // Add properties for rendering the category
                rec.catColor = this.categories.get(rec.category) || "";
                rec.showCategory = this.settings.order_by != "category";
            }.bind(this));

            // Save the categories in case any new ones have been added
            this.categories.save();

            // Update records
            this.records = records;
            this.empty = !count;
        },
        recordClicked: function(event, detail, sender) {
            this.selected = sender.templateInstance.model;
        },
        import: function() {
            this.fire("import");
        },
        show: function() {
            this.marked = null;
            PadlockView.prototype.show.apply(this, arguments);
        },
        synchronize: function() {
            this.fire("synchronize");
        },
        recordsChanged: function() {
            this.marked = null;
        },
        markNext: function() {
            if (this.records.length) {
                if (this.marked === null) {
                    this.marked = 0;
                } else {
                    this.marked = (this.marked + 1 + this.records.length) % this.records.length;
                }
            }
        },
        markPrev: function() {
            if (this.records.length) {
                if (this.marked === null) {
                    this.marked = this.records.length - 1;
                } else {
                    this.marked = (this.marked - 1 + this.records.length) % this.records.length;
                }
            }
        },
        markedChanged: function(markedOld, markedNew) {
            var elements = this.shadowRoot.querySelectorAll(".record-item"),
                oldEl = elements[markedOld],
                newEl = elements[markedNew];

            if (oldEl) {
                oldEl.classList.remove("marked");
            }
            if (newEl) {
                newEl.classList.add("marked");
                this.scrollIntoView(newEl);
            }
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
            this.selected = this.records[this.marked];
        },
        selectedChanged: function() {
            var ind = this.records.indexOf(this.selected);
            this.marked = ind !== -1 ? ind : null;
        }
    });

})(Polymer);