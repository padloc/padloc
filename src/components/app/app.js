Polymer("padlock-app", {
    init: function(collection, settings, categories) {
        this.collection = collection;
        this.settings = settings;
        this.categories = categories;

        this.settings.fetch();

        this.categories.fetch();
        this.$.categoriesView.updateCategories();

        this.collection.exists({success: this.initView.bind(this), fail: this.initView.bind(this, false)});

        // If we want to capture all keydown events, we have to add the listener
        // directly to the document
        document.addEventListener("keydown", this.keydown.bind(this), false);
    },
    initView: function(collExists) {
        require(["padlock/platform"], function(platform) {
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            var initialView = collExists ? this.$.lockView : this.$.passwordView;

            // iOS gets a special treatment since it has the ability to run a website
            // as a 'standalone' web app and we want to use that!
            if (platform.isIOS()) {
                // Add a special class in case the app is lanchend from the home screen in iOS,
                // otherwise as the user to add the site to their home screen.
                if (platform.isIOSStandalone()) {
                    this.classList.add("ios-standalone");
                    // On most browsers the mousedown event is coupled to triggering focus on
                    // the clicked elements. Since we're directly handling focussing inputs
                    // with the padlock-input element we need to disable the native mechanism
                    // to prevent conflicts.
                    this.preventMousedownDefault = true;
                } else {
                    initialView = this.$.homescreenView;
                }
            }

            // open the first view
            this.openView(initialView, {
                inAnimation: "floatUp",
                inDuration: 1000
            });
        }.bind(this));
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
        this.collection.fetch({password: password, success: function() {
            this.updateCategories(this.collection.records);
            this.$.lockView.errorMessage = null;
            this.openView(this.$.listView);
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this.synchronize();
            }
        }.bind(this), fail: function() {
            this.$.lockView.errorMessage = "Wrong password!";
        }.bind(this)});
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
        view.show(params.inAnimation, params.inDuration, params.inCallback);

        this.currentView = view;
    },
    //* Saves changes to the currently selected record (if any)
    saveRecord: function() {
        var record = this.selected;
        if (record) {
            // Save the changes
            this.collection.save({record: record});
            this.$.listView.prepareRecords();
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this.synchronize();
            }
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
        this.$.listView.prepareRecords();
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
        this.$.notConnectedDialog.open = false;
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
        this.updateCategories(detail.records);
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
        if (this.preventMousedownDefault) {
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
    //* Adds any categories inside of _records_ that don't exist yet
    updateCategories: function(records) {
        records.forEach(function(rec) {
            if (rec.category && !this.categories.get(rec.category)) {
                this.categories.set(rec.category, this.categories.autoColor());
            }
        }.bind(this));

        this.categories.save();
        this.$.categoriesView.updateCategories();
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
    },
    categoryChanged: function(event, detail, sender) {
        this.collection.records.forEach(function(rec) {
            if (rec.category == detail.prev.name) {
                rec.category = detail.curr.name;
                rec.catColor = detail.curr.color;
            }
        });
    },
    //* Starts a spinner animation on the menu icon
    startSpinner: function() {
        this.spinnerStarted = new Date();
        this.$.listView.headerOptions.leftIconShape = "spinner";
        this.$.header.updateIcons();
    },
    //* Stops the spinner animation on the menu icon
    stopSpinner: function() {
        // Make sure the spinner animates at least for a certain amount of time,
        // because otherwise it will look weird.
        var minDur = 2000,
            timePassed = new Date().getTime() - this.spinnerStarted.getTime(),
            delay = Math.max(minDur - timePassed, 0);

        setTimeout(function() {
            this.$.listView.headerOptions.leftIconShape = "menu";
            this.$.header.updateIcons();
        }.bind(this), delay);
    },
    //* Synchronizes the data with a remote source
    synchronize: function() {
        // In case this was called from the menu
        this.$.mainMenu.open = false;

        // Check if the user has connected the client to the cloud already.
        // If not, prompt him to do so
        if (this.settings.sync_connected) {
            this.remoteSource = this.remoteSource || new CloudSource();
            this.remoteSource.host = this.settings.sync_host;
            this.remoteSource.email = this.settings.sync_email;
            this.remoteSource.apiKey = this.settings.sync_key;

            this.startSpinner();

            this.collection.sync(this.remoteSource, {
                success: function() {
                    this.stopSpinner();
                    // Update the local set of categories with the categories from any
                    // newly added records
                    this.updateCategories(this.collection.records);
                    // Rerender items in list view
                    this.$.listView.prepareRecords();
                }.bind(this),
                fail: function(req) {
                    var msg = req.status == 401 ? "Authentication failed. Have you visited the link in the activation email yet?" :
                        "An error occurred while synchronizing. Please try again later!";
                    this.alert(msg);
                    this.stopSpinner();
                }.bind(this)
            });
        } else {
            this.$.notConnectedDialog.open = true;
        }
    },
    dismissNotConnectedDialog: function() {
        this.$.notConnectedDialog.open = false;
    }
});