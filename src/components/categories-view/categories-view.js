/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-categories-view",
        behaviors: [ViewBehavior],
        properties: {
            categories: Object,
            record: Object,
            _editing: Object,
            _categoryList: Array
        },
        observers: [
            "_updateHeaderTitle(record.name)"
        ],
        ready: function() {
            this.leftHeaderIcon = "cancel";
            this.rightHeaderIcon = "plus";
            this._updateHeaderTitle();
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            this._newCategory();
        },
        _updateCategories: function() {
            this._categoryList = this.categories.asArray();
        },
        show: function() {
            this._updateCategories();
            ViewBehavior.show.apply(this, arguments);
        },
        _categoryTapped: function(e) {
            this.set("record.category", e.model.item.name);
            this._delayedBack();
        },
        //* Updates the headerTitle property with the name of the current record
        _updateHeaderTitle: function() {
            this.headerTitle = this.record && this.record.name || "Categories";
        },
        _newCategory: function() {
            this._editing = null;
            this.$.nameInput.value = "";
            this.$.colorSelect.selected = Polymer.dom(this.$.colorSelect).children[0];
            this.$.editDialog.open = true;
        },
        _editCategory: function(e) {
            var category = e.model.item;

            this._editing = category;
            this.$.nameInput.value = category.name;

            // Select current color
            this.$.colorSelect.selectValue(category.color.toString());

            this.$.editDialog.open = true;
            e.stopPropagation();
        },
        _editEnter: function() {
            var name = this.$.nameInput.value,
                color = parseInt(this.$.colorSelect.value, 10);

            if (name) {
                this.$.editDialog.open = false;
                if (this._editing) {
                    this._doEditCategory(this._editing, name, color);
                } else {
                    this._doNewCategory(name, color);
                }
            }
        },
        _doNewCategory: function(name, color) {
            if (!this.categories.get(name)) {
                this.categories.set(name, color);
                this.categories.save();
                this._updateCategories();
            }
            this.set("record.category", name);
            this._delayedBack(200);
        },
        _doEditCategory: function(category, name, color) {
            var oldCat = {
                name: category.name,
                color: category.color
            };

            if (name != category.name) {
                this.categories.remove(category.name);
            }
            this.categories.set(name, color);
            this.categories.save();
            this.fire("categorychanged", {prev: oldCat, curr: {name: name, color: color}});
            this._updateCategories();
            if (this.record.category == name) {
                this._delayedBack(200);
            }
        },
        _removeCategory: function() {
            this.$.editDialog.open = false;
            this.$.confirmRemoveDialog.open = true;
        },
        _confirmRemove: function() {
            var category = this._editing;
            this.$.confirmRemoveDialog.open = false;
            this.categories.remove(this._editing.name);
            this.categories.save();
            this.fire("categorychanged", {prev: category, curr: {name: ""}});
            this._updateCategories();
            if (!this.record.category) {
                this._delayedBack(200);
            }
        },
        _cancelRemove: function() {
            this.$.confirmRemoveDialog.open = false;
        },
        _selectNone: function() {
            this.set("record.category", "");
            this._delayedBack();
        },
        _editDialogClosed: function() {
            this.$.colorSelect.open = false;
        },
        _categoryClass: function(color) {
            return "category color" + color;
        },
        _isSelected: function(cat, currentCat) {
            return cat == currentCat;
        },
        _delayedBack: function(delay) {
            this.async(this.fire.bind(this, "back"), delay || 50);
        },
        _hasCategories: function(count) {
            return !!count;
        }
    });

})(Polymer, padlock.ViewBehavior);
