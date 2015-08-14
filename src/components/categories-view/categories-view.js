/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-categories-view",
        behaviors: [ViewBehavior],
        properties: {
            categories: Array,
            record: Object,
            _editing: Object,
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
        _categoryTapped: function(e) {
            this.set("record.category", e.model.item);
            this._delayedBack();
        },
        //* Updates the headerTitle property with the name of the current record
        _updateHeaderTitle: function() {
            this.headerTitle = this.record && this.record.name || "Categories";
        },
        _newCategory: function() {
            this._editing = null;
            this.$.nameInput.value = "";
            this.$.editDialog.open = true;
        },
        _editCategory: function(e) {
            var category = e.model.item;
            this._editing = category;
            this.$.nameInput.value = category;
            this.$.editDialog.open = true;
            e.stopPropagation();
        },
        _editEnter: function() {
            var name = this.$.nameInput.value;

            if (name) {
                this.$.editDialog.open = false;
                if (this._editing) {
                    this._doEditCategory(this._editing, name);
                } else {
                    this._doNewCategory(name);
                }
            }
        },
        _doNewCategory: function(category) {
            this.set("record.category", category);
            if (this.categories.indexOf(category) == -1) {
                this.push("categories", category);
            }
            this._delayedBack(200);
        },
        _doEditCategory: function(oldName, newName) {
            var ind = this.categories.indexOf(oldName);
            this.set("categories." + ind, newName);
            this.fire("categorychanged", {previous: oldName, current: newName});
            if (this.record.category == newName) {
                this._delayedBack(200);
            }
        },
        _removeCategory: function() {
            this.$.editDialog.open = false;
            this.$.confirmRemoveDialog.open = true;
        },
        _confirmRemove: function() {
            var category = this._editing;
            var index = this.categories.indexOf(category);
            this.$.confirmRemoveDialog.open = false;
            this.fire("categorychanged", {previous: category, current: ""});
            this.splice("categories", index, 1);
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
