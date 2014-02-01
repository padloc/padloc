Polymer("padlock-app", {
    ready: function() {
        require(["padlock/model"], function(model) {
            this.collection = new model.Collection();
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            this.openView(this.collection.exists() ? this.$.lockView : this.$.passwordView);
        }.bind(this));

        if (window.navigator.standalone) {
            this.classList.add("ios-standalone");
        }
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
        this.openView(this.$.lockView, function() {
            this.collection.lock();
        }.bind(this));
    },
    //* Change handler for the selected property; Opens the record view when record is selected
    selectedChanged: function() {
        if (this.selected) {
            this.$.recordView.record = this.selected;
            this.openView(this.$.recordView);
        }
    },
    /**
     * Opens the provided _view_
     * @param  {PadlockView} view
     * @param  {Function}    outCallback Called after out animation has finished
     * @param  {Function}    inCallback  Called after in animation has finished
     */
    openView: function(view, outCallback, inCallback) {
        var views = this.shadowRoot.querySelectorAll(".view").array();
        // Choose left or right animation based on the order the views
        // are included in the app
        var back = views.indexOf(view) < views.indexOf(this.currentView);

        // Hide current view (if any)
        if (this.currentView) {
            this.currentView.hide(back ? "slideOutToRight": "slideOutToLeft", outCallback);
        }

        // Show new view
        setTimeout(function() {
            view.show(back ? "slideInFromLeft": "slideInFromRight", inCallback);
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
        }
    },
    //* Opens the dialog for adding a new record
    addRecord: function() {
        this.$.addInput.value = "";
        this.$.addDialog.open = true;
        // this.$.addInput.focus();
    },
    confirmAddRecord: function() {
        this.$.addInput.blur();
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
    }
});