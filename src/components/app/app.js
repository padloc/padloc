Polymer("padlock-app", {
    ready: function() {
        require(["padlock/model"], function(model) {
            this.categories = new model.Categories(null, 3);
            this.categories.fetch();
            this.collection = new model.Collection();
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            this.openView(this.collection.exists() ? this.$.lockView : this.$.passwordView, {
                inAnimation: "floatUp",
                inDuration: 1000
            });
        }.bind(this));

        // Add a special class in case the app is lanchend from the home screen in iOS
        if (window.navigator.standalone) {
            this.classList.add("ios-standalone");
        }

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this.keydown.bind(this), false);
    },
    pwdEnter: function(event, detail, sender) {
        this.unlock(detail.password);
    },
    newPwdEnter: function(event, detail, sender) {
        this.collection.setPassword(detail.password);
        this.openView(this.$.listView);
    },
    //* Tries to unlock the current collection with the provided password
    unlock: function(password) {
        if (this.collection.fetch(password)) {
            this.$.lockView.errorMessage = null;
            this.openView(this.$.listView);
        } else {
            this.$.lockView.errorMessage = "Wrong password!";
        }
    },
    //* Locks the collection and opens the lock view
    lock: function() {
        this.$.mainMenu.open = false;
        this.openView(this.$.lockView, {
            inAnimation: "floatUp",
            inDuration: 1000
        }, function() {
            this.collection.lock();
        }.bind(this));
    },
    //* Change handler for the selected property; Opens the record view when record is selected
    selectedChanged: function() {
        if (this.selected) {
            this.$.recordView.record = this.selected;
            this.openView(this.$.recordView);
            this.$.header.blurFilterInput();
        }
    },
    /**
     * Opens the provided _view_
     */
    openView: function(view, params) {
        var views = this.shadowRoot.querySelectorAll(".view").array(),
            // Choose left or right animation based on the order the views
            // are included in the app
            back = views.indexOf(view) < views.indexOf(this.currentView);

        // Unless otherwise specified, use a right-to-left animation when navigating 'forward'
        // and a left-to-right animation when animating 'back'
        params = params || {};
        if (!("outAnimation" in params)) {
            params.outAnimation = params.outAnimation || (back ? "slideOutToRight": "slideOutToLeft");
        }
        if (!("inAnimation" in params)) {
            params.inAnimation = params.inAnimation || (back ? "slideInFromLeft": "slideInFromRight");
        }

        // Hide current view (if any)
        if (this.currentView) {
            this.currentView.hide(params.outAnimation, params.outDuration, params.outCallback);
        }

        // Show new view
        setTimeout(function() {
            view.show(params.inAnimation, params.inDuration, params.inCallback);
        }, 10);

        this.currentView = view;
    },
    //* Saves changes to the currently selected record (if any)
    saveRecord: function() {
        var record = this.selected;
        if (record) {
            record.name = record.name || "Unnamed";
            // Filter out fields that have neither a name nor a value
            record.fields = record.fields.filter(function(field) {
                return field.name || field.value;
            });
            // Save the changes
            this.collection.save();
            this.$.listView.prepareRecords();
        }
    },
    //* Opens the dialog for adding a new record
    addRecord: function() {
        this.$.addInput.value = "";
        this.$.addDialog.open = true;
        // this.$.addInput.focus();
    },
    confirmAddRecord: function() {
        this.$.addDialog.open = false;
        var record = {
            name: this.$.addInput.value,
            fields: []
        };

        this.collection.add(record);

        // select the newly added record (which will open the record view)
        this.selected = record;
        this.saveRecord();
    },
    //* Deletes the currently selected record (if any)
    deleteRecord: function() {
        this.collection.remove(this.selected);
        this.collection.save();
        this.recordViewBack();
    },
    recordViewBack: function(event, detail, sender) {
        this.selected = null;
        this.openView(this.$.listView);
    },
    //* Opens the main menu (duh)
    openMainMenu: function() {
        this.$.mainMenu.open = true;
    },
    openSettings: function() {
        this.$.mainMenu.open = false;
        this.openView(this.$.settingsView);
    },
    settingsBack: function() {
        this.openView(this.$.listView);
    },
    //* Opens the import view
    openImportView: function() {
        this.$.mainMenu.open = false;
        // Add a small delay to avoid issues with the animation. TODO: Find a better solution?
        this.openView(this.$.importView);
    },
    //* Add the records imported with the import view to the collection
    saveImportedRecords: function(event, detail) {
        this.collection.add(detail.records);
        this.collection.save();
        this.alert(detail.records.length + " records imported!");
        this.openView(this.$.listView);
    },
    importBack: function() {
        this.openView(this.$.listView);
    },
    //* Triggers the headers scrim to match the scrim of the opened dialog
    dialogOpen: function(event, detail, sender) {
        this.$.header.scrim = true;
    },
    //* Removes the headers scrim
    dialogClose: function(event, detail, sender) {
        this.$.header.scrim = false;
    },
    //* Show an alert dialog with the provided message
    alert: function(msg) {
        this.$.alertText.innerHTML = msg;
        this.$.alertDialog.open = true;
    },
    dismissAlert: function() {
        this.$.alertDialog.open = false;
    },
    mousedown: function() {
        if ('ontouchstart' in window) {
            // On most browsers the mousedown event is coupled to triggering focus on
            // the clicked elements. Since we're directly handling focussing inputs
            // with the fast-input element we need to disable the native mechanism
            // to prevent conflicts.
            event.preventDefault();
            event.stopPropagation();
        }
    },
    //* Captures all keydown events and brings focus to the filter input if it is showing
    keydown: function(event) {
        // We don't want to steal focus from any other input elements so we'll only focus
        // the filter input if the event does not come from a input or textarea element.
        // Unfortunately Polymer obscures the actual event target so we'll have to access
        // the orginial event (event.impl) to get the actual target. This might break
        // with future versions of polymer or the native web components implementation.
        var isInput = event.impl.target.toString() == "[object HTMLInputElement]" ||
            event.impl.target.toString() == "[object HTMLTextAreaElement]";

        // Focus the filter input if the event does not come from an input element and
        // if the filter input is currently showing.
        if (!isInput && this.currentView && this.currentView.headerOptions.showFilter) {
            this.$.header.focusFilterInput();
        }
    },
    openCategories: function() {
        this.openView(this.$.categoriesView, {
            outAnimation: "slideOutToBottom",
            inAnimation: ""
        });
    },
    categoriesDone: function() {
        this.saveRecord();
        this.openView(this.$.recordView, {
            outAnimation: "fadeOut",
            inAnimation: "slideInFromBottom"
        });
    }
});