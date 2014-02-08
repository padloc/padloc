Polymer("padlock-categories-view", {
    headerOptions: {
        show: true,
        leftIconShape: "cancel",
        rightIconShape: ""
    },
    titleText: "Categories",
    observe: {
        "record.name": "updateTitleText"
    },
    leftHeaderButton: function() {
        this.fire("done");
    },
    updateCategories: function() {
        this.categoryList = this.categories.asArray();
    },
    show: function() {
        var minDelay = 0,
            maxDelay = 200,
            delay;

        Array.prototype.forEach.call(this.shadowRoot.querySelectorAll(".category"), function(catEl) {
            delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
            catEl.style["-webkit-animation-delay"] = delay + "ms";
        });
        this.super(arguments);
    },
    categoryTapped: function(event, detail, sender) {
        this.record.category = sender.templateInstance.model.category.name;
        this.record.catColor = sender.templateInstance.model.category.color;
    },
    //* Updates the titleText property with the name of the current record
    updateTitleText: function() {
        this.titleText = this.record && this.record.name;
    },
    newCategory: function() {
        this.categoryEditing = null;
        this.$.nameInput.value = "";
        this.$.colorSelect.selected = this.$.colorSelect.children[0];
        this.$.removeButton.style.display = "none";
        this.$.editDialog.open = true;
    },
    editCategory: function(event, detail, sender) {
        var colorOptions = this.$.colorSelect.children,
            category = sender.templateInstance.model.category;

        this.categoryEditing = category;
        this.$.nameInput.value = category.name;

        for (var i=0, co; i<colorOptions.length; i++) {
            co = colorOptions[i];
            if (parseInt(co.value, 10) == category.color) {
                this.$.colorSelect.selected = co;
                break;
            }
        }
        this.$.removeButton.style.display = "";
        
        this.$.editDialog.open = true;
    },
    editEnter: function() {
        var name = this.$.nameInput.value;
            color = parseInt(this.$.colorSelect.selected.value, 10);

        if (name) {
            this.$.editDialog.open = false;
            if (this.categoryEditing) {
                this.doEditCategory(this.categoryEditing, name, color);
            } else {
                this.doNewCategory(name, color);
            }
        }
    },
    doNewCategory: function(name, color) {
        if (!this.categories.get(name)) {
            this.categories.set(name, color);
            this.categories.save();
            this.categoryList.push({name: name, color: color});
        }
        this.record.category = name;
    },
    doEditCategory: function(category, name, color) {
        var oldCat = {
            name: category.name,
            color: category.color
        };

        this.categories.remove(category.name);
        this.categories.set(name, color);
        this.categories.save();
        category.name = name;
        category.color = color;
        this.fire("categorychanged", {prev: oldCat, curr: category});
    }
});