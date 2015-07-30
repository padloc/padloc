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
            _editing: Object
        },
        observers: [
            "_updateHeaderTitle(record.name)"
        ],
        ready: function() {
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "cancel";
            this.headerOptions.rightIconShape = "plus";
            this._updateHeaderTitle();
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        rightHeaderButton: function() {
            this._newCategory();
        },
        _updateCategories: function() {
            this.categoryList = this.categories.asArray();
        },
        show: function() {
            this._updateCategories();
            ViewBehavior.show.apply(this, arguments);
        },
        _categoryTapped: function(e) {
            this.set("record.category", e.model.item.name);
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
            var colorOptions = Polymer.dom(this.$.colorSelect).children,
                category = e.model.item;

            this._editing = category;
            this.$.nameInput.value = category.name;

            // Select current color
            for (var i=0, co; i<colorOptions.length; i++) {
                co = colorOptions[i];
                if (parseInt(co.value, 10) == category.color) {
                    this.$.colorSelect.selected = co;
                    break;
                }
            }

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
        },
        _doEditCategory: function(category, name, color) {
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
            this._updateCategories();
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
        },
        _cancelRemove: function() {
            this.$.confirmRemoveDialog.open = false;
        },
        _selectNone: function() {
            this.set("record.category", "");
        },
        _editDialogClosed: function() {
            this.$.colorSelect.open = false;
        },
        _categoryClass: function(color) {
            return "category color" + color;
        },
        _isSelected: function(cat, currentCat) {
            return cat == currentCat;
        }
    });

})(Polymer, padlock.ViewBehavior);
