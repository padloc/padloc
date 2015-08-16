/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-categories-view",
        behaviors: [ViewBehavior],
        properties: {
            categories: Array,
            record: Object
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
            this.fire("open-form", {
                title: "New Category",
                components: [
                    {element: "input", placeholder: "Category Name", name: "name"},
                    {element: "button", label: "Create", submit: true}
                ],
                submit: function(data) {
                    this.set("record.category", data.name);
                    if (this.categories.indexOf(data.name) == -1) {
                        this.push("categories", data.name);
                    }
                    this._delayedBack(200);
                }.bind(this)
            });
        },
        _editCategory: function(e) {
            var category = e.model.item;
            this.fire("open-form", {
                title: "Edit '" + category + "'",
                components: [
                    {element: "input", placeholder: "Category Name", name: "name", value: category},
                    {element: "button", label: "Save", submit: true},
                    {element: "button", label: "Remove", cancel: true, tap: this._removeCategory.bind(this, category)}
                ],
                submit: function(data) {
                    var ind = this.categories.indexOf(category);
                    this.set("categories." + ind, data.name);
                    this.fire("categorychanged", {previous: category, current: data.name});
                    if (this.record.category == data.name) {
                        this._delayedBack(200);
                    }
                }.bind(this)
            });
            event.stopPropagation();
        },
        _removeCategory: function(category) {
            this.fire("open-form", {
                title: "Are you sure you want to remove this category? The category will be removed " +
                    "from all other records as well.",
                components: [
                    {element: "button", label: "Remove", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                submit: function() {
                    var index = this.categories.indexOf(category);
                    this.fire("categorychanged", {previous: category, current: ""});
                    this.splice("categories", index, 1);
                    if (!this.record.category) {
                        this._delayedBack(200);
                    }
                }.bind(this)
            });
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
