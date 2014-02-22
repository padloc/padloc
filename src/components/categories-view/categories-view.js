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
            prefix = require("padlock/platform").getVendorPrefix().css,
            catElements = this.shadowRoot.querySelectorAll(".category"),
            delay;

        // Apparently firefox doesn't want a prefix when setting styles directly
        prefix = prefix == "-moz-" ? "" : prefix;

        this.super(arguments);

        // Remove animation property so the animation will restart
        Array.prototype.forEach.call(catElements, function(catEl) {
            catEl.style[prefix + "animation"] = "none";
        });

        // Trigger style recalculation to make sure the style change is applied
        // when we re-add the animation property
        this.offsetLeft;

        // Trigger bounce in animation with random invidiual delays
        Array.prototype.forEach.call(catElements, function(catEl) {
            delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
            catEl.style[prefix + "animation"] = "bounceIn 0.5s ease " + delay + "ms both";
        });
    },
    categoryTapped: function(event, detail, sender) {
        this.record.category = sender.templateInstance.model.category.name;
        this.record.catColor = sender.templateInstance.model.category.color;
        this.bounce(sender);
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
        this.bounce(sender);
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
    },
    removeCategory: function() {
        this.$.editDialog.open = false;
        this.$.confirmRemoveDialog.open = true;
    },
    confirmRemove: function() {
        var category = this.categoryEditing,
            catList = this.categoryList;
        this.$.confirmRemoveDialog.open = false;
        this.categories.remove(this.categoryEditing.name);
        this.categories.save();
        this.fire("categorychanged", {prev: category, curr: {}});
        this.updateCategories();
    },
    cancelRemove: function() {
        this.$.confirmRemoveDialog.open = false;
    },
    selectNone: function(event, detail, sender) {
        delete this.record.category;
        this.bounce(sender);
    },
    bounce: function(el) {
        var prefix = require("padlock/platform").getVendorPrefix().css;
        // Apparently firefox doesn't want a prefix when setting styles directly
        prefix = prefix == "-moz-" ? "" : prefix;
        el.style[prefix + "animation"] = "none";
        // Trigger style recalculation
        el.offsetLeft;
        el.style[prefix + "animation"] = "bounce 0.5s ease 0s both";
    }
});