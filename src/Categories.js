padlock.Categories = (function(util) {
    /**
     * Manager object for a categories. Each category has a name
     * and a color, which is encoded as a number between 1 and _numColor_
     *
     * @param {String}  name The name, used for persistent storage
     * @param {Integer} numColor [description]
     */
    var Categories = function(name, numColors, source) {
        this.name = name || "default";
        this.categories = {};
        this.numColors = numColors || 0;
        this.source = source;
    };

    Categories.prototype.getKey = function() {
        return "cat_" + this.name;
    };

    //* Sets the _color_ for a _category_. Adds the category if it doesn't exist yet.
    Categories.prototype.set = function(category, color) {
        this.categories[category] = color;
    };

    //* Returns the color for a _category_ or _undefined_ if the category does not exist
    Categories.prototype.get = function(category) {
        return this.categories[category];
    };

    //* Removes a _category_ from the existing set of categories.
    Categories.prototype.remove = function(category) {
        delete this.categories[category];
    };

    //* Fetches stored categories from local storage 
    Categories.prototype.fetch = function(opts) {
        opts = opts || {};
        var success = opts.success;
        opts.success = function(data) {
            // Merge in categories into _this.categories_ object. This will _not_
            // overwrite categories already added.
            this.categories = util.mixin(this.categories, data);

            if (success) {
                success();
            }
        }.bind(this);
        opts.key = this.getKey();
        this.source.fetch(opts);
    };

    //* Saves categories to local storage
    Categories.prototype.save = function(opts) {
        opts = opts || {};
        opts.key = this.getKey();
        opts.data = this.categories;
        
        this.source.save(opts);
    };

    //* Returns the preferable color for a new category
    Categories.prototype.autoColor = function() {
        // TODO: Check current distribution and return color which is currently
        // being used the least
        return Math.ceil(Math.random() * this.numColors);
    };

    //* Returns an Array represantation of the categories set.
    Categories.prototype.asArray = function() {
        var arr = [];

        for (var cat in this.categories) {
            arr.push({
                name: cat,
                color: this.categories[cat]
            });
        }

        return arr;
    };

    return Categories;
})(padlock.util);