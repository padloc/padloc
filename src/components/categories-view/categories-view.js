/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior, platform) {
    "use strict";

    Polymer({
        is: "padlock-categories-view",
        behaviors: [ViewBehavior],
        properties: {
            categories: Object,
            record: Object
        },
        ready: function() {
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "cancel";
            this.headerOptions.rightIconShape = "";
            this.headerTitle = "Categories";
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        updateCategories: function() {
            this.categoryList = this.categories.asArray();
        },
        show: function() {
            this.updateCategories();
            ViewBehavior.show.apply(this, arguments);
        },
        categoryTapped: function(e) {
            this.record.category = e.model.item.name;
            this.bounce(e.currentTarget);
        },
        //* Updates the titleText property with the name of the current record
        _updateTitleText: function() {
            this.titleText = this.record && this.record.name;
        },
        newCategory: function() {
            this.categoryEditing = null;
            this.$.nameInput.value = "";
            this.$.colorSelect.selected = this.$.colorSelect.children[0];
            this.$.removeButton.style.display = "none";
            this.$.editDialog.open = true;
            this.bounce(this.$.newButton);
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
            var name = this.$.nameInput.value,
                color = parseInt(this.$.colorSelect.value, 10);

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
            var category = this.categoryEditing;

            this.$.confirmRemoveDialog.open = false;
            this.categories.remove(this.categoryEditing.name);
            this.categories.save();
            this.fire("categorychanged", {prev: category, curr: {}});
            this.updateCategories();
        },
        cancelRemove: function() {
            this.$.confirmRemoveDialog.open = false;
        },
        selectNone: function() {
            this.record.category = "";
            this.bounce(this.$.noneButton);
        },
        bounce: function(el) {
            var prefix = platform.getVendorPrefix().css;
            // Apparently firefox doesn't want a prefix when setting styles directly
            prefix = prefix == "-moz-" ? "" : prefix;
            el.style[prefix + "animation"] = "none";
            // Trigger style recalculation
            // jshint expr: true
            el.offsetLeft;
            // jshint expr: false
            el.style[prefix + "animation"] = "bounce 0.5s ease 0s both";
        },
        editDialogClosed: function() {
            this.$.colorSelect.open = false;
        },
        _categoryClass: function(color) {
            return "category color" + color;
        }
    });

})(Polymer, padlock.ViewBehavior, padlock.platform);
