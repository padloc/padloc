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

        this.updateCategories();
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
    }
});