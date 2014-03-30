Polymer("padlock-list-view", {
    orderByCategory: false,
    headerOptions: {
        show: true,
        leftIconShape: "menu",
        rightIconShape: "plus",
        showFilter: true
    },
    observe: {
        filterString: "prepareRecords",
        "collection.records": "prepareRecords",
        "orderBy": "prepareRecords"
    },
    leftHeaderButton: function() {
        this.fire("menu");
    },
    rightHeaderButton: function() {
        this.fire("add");
    },
    getAnimationElement: function() {
        return this.$.list;
    },
    prepareRecords: function() {
        if (!this.collection) {
            return;
        }

        var fs = this.filterString && this.filterString.toLowerCase(),
            words = fs.split(" "),
            removedCount = 0;

        // Filter records based on filter string. Also, while we're at it filter out
        // removed records.
        var records = this.collection.records.filter(function(rec) {
            if (rec.removed) {
                removedCount++;
                return false;
            }
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
        });

        // Add some metadata to each record and do some other preparation work
        for (var i=0, rec; i<records.length; i++) {
            rec = records[i];

            // Add the records category to known categories and assign it a color if it doesn't exist yet.
            // This is done here mainly for efficiency reasons.
            if (rec.category && !this.categories.get(rec.category)) {
                this.categories.set(rec.category, this.categories.autoColor());
            }

            // Give it a section property for the rendering of the section headers
            rec.section = this.orderBy == "category" ? rec.category || "other" : rec.name.toUpperCase()[0];

            // Add properties for rendering the category
            rec.catColor = this.categories.get(rec.category) || "";
            rec.showCategory = this.orderBy != "category";
        }

        // Save the categories in case any new ones have been added
        this.categories.save();

        // Sort by section property first, name second
        records = records.sort(function(a, b) {
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

        // Set _firstInSection_ property so we know were to display section headers
        for (i=0; i<records.length; i++) {
            records[i].firstInSection = !records[i-1] || records[i-1].section != records[i].section;
        }

        // Update _records_ 
        this.records = records;
        this.empty = !(this.collection && this.collection.records.length > removedCount);
    },
    recordClicked: function(event, detail, sender) {
        this.selected = sender.templateInstance.model;
    },
    import: function() {
        this.fire("import");
    },
    show: function(animation, duration, callback) {
        this.super([animation, duration, callback]);
        // This solves a problem in iOS where scrolling would sometimes not work
        // on iOS after unlocking the app
        this.style.overflow = "visible";
        this.offsetLeft;
        this.style.overflow = "";
    },
    synchronize: function() {
        this.fire("synchronize");
    }
});