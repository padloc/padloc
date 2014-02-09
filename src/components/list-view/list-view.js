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

        // Filter records based on filter string
        var fs = this.filterString && this.filterString.toLowerCase();
        var records = fs ? this.collection.records.filter(function(rec) {
            return rec.category && rec.category.toLowerCase().search(fs) != -1 || rec.name.toLowerCase().search(fs) != -1;
        }) : this.collection.records.slice();

        // Set _section_ and _color_ for each item
        for (var i=0, rec; i<records.length; i++) {
            rec = records[i];
            rec.section = this.orderBy == "category" ? rec.category || "other" : rec.name.toUpperCase()[0];
            rec.catColor = this.categories.get(rec.category) || "";
            rec.showCategory = this.orderBy != "category";
        }

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
        this.empty = !(this.collection && this.collection.records.length);
    },
    recordClicked: function(event, detail, sender) {
        this.selected = sender.templateInstance.model;
    },
    import: function() {
        this.fire("import");
    }
});