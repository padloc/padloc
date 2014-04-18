Polymer("padlock-app", {
    init: function(collection, settings, categories) {
        this.collection = collection;
        this.settings = settings;
        this.categories = categories;

        this.settings.fetch();

        this.categories.fetch();

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
        this.$.decrypting.show();
        this.collection.fetch({password: password, success: function() {
            this.$.lockView.errorMessage = null;
            this.openView(this.$.listView);
            this.$.decrypting.hide();
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this.synchronize();
            }
        }.bind(this), fail: function() {
            this.$.lockView.errorMessage = "Wrong password!";
            this.$.decrypting.hide();
        }.bind(this)});
    },
    //* Locks the collection and opens the lock view
    lock: function() {
        this.$.mainMenu.open = false;
        // Remove the stored password from the remote source if we've created on yet
        if (this.remoteSource) {
            delete this.remoteSource.password;
        }
        this.openView(this.$.lockView, {
            inAnimation: "floatUp",
            inDuration: 1000,
            outCallback: this.collection.clear.bind(this.collection)
        });
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
            fields: this.settings.default_fields.map(function(field) {
                return {name: field, value: ""};
            })
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
        // Auto sync
        if (this.settings.sync_connected && this.settings.sync_auto) {
            this.synchronize();
        }
    },
    recordViewBack: function(event, detail, sender) {
        this.selected = null;
        this.openView(this.$.listView);
    },
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
    openImportView: function() {
        this.openView(this.$.importView);
    },
    //* Add the records imported with the import view to the collection
    saveImportedRecords: function(event, detail) {
        this.collection.add(detail.records);
        this.collection.save();
        this.alert(detail.records.length + " records imported!");
        this.openView(this.$.listView);
        // Auto sync
        if (this.settings.sync_connected && this.settings.sync_auto) {
            this.synchronize();
        }
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
    //* Keyboard shortcuts
    keydown: function(event) {
        var shortcut;

        // CTRL/CMD + F
        if ((event.ctrlKey || event.metaKey) && event.keyCode === 70) {
            shortcut = this.$.header.focusFilterInput.bind(this.$.header);
        }

        // If one of the shortcuts matches, execute it and prevent the default behaviour
        if (shortcut) {
            shortcut();
            event.preventDefault();
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
    //* Synchronizes the data with a remote source
    synchronize: function(remotePassword) {
        // Ignore the remotePassword argument if it is not a string
        remotePassword = typeof remotePassword === "string" ? remotePassword : undefined;
        // In case this was called from the menu
        this.$.mainMenu.open = false;

        // Check if the user has connected the client to the cloud already.
        // If not, prompt him to do so
        if (this.settings.sync_connected) {
            this.remoteSource = this.remoteSource || new CloudSource();
            this.remoteSource.host = this.settings.sync_host;
            this.remoteSource.email = this.settings.sync_email;
            this.remoteSource.apiKey = this.settings.sync_key;

            this.$.synchronizing.show();

            this.collection.sync(this.remoteSource, {
                remotePassword: remotePassword,
                success: function() {
                    this.$.synchronizing.hide();

                    // If we explicitly used a differen password for the remote source than for the local source,
                    // ask the user if he wants to update the remote password
                    if (remotePassword !== undefined && this.collection.store.defaultSource.password !== remotePassword) {
                        this.$.updateRemotePasswordDialog.open = true;
                    }
                }.bind(this),
                fail: function(e) {
                    if (e && e.message == "Uncaught CORRUPT: ccm: tag doesn't match") {
                        // Decryption failed, presumably on the remote data. This means that the local master
                        // password does not match the one that was used for encrypting the remote data so
                        // we need to prompt the user for the correct password.
                        this.$.remotePasswordDialog.open = true;
                    } else {
                        var msg = e.status == 401 ?
                            "Authentication failed. Have you completed the connection process for Padlock Cloud? " +
                            "If the problem persists, try to disconnect and reconnect under settings!" :
                            "An error occurred while synchronizing. Please try again later!";
                        this.alert(msg);
                    }
                    this.$.synchronizing.hide();
                }.bind(this)
            });
        } else {
            this.$.notConnectedDialog.open = true;
        }
    },
    dismissNotConnectedDialog: function() {
        this.$.notConnectedDialog.open = false;
    },
    remotePasswordEntered: function() {
        this.$.remotePasswordDialog.open = false;
        this.synchronize(this.$.remotePasswordInput.value);
        this.$.remotePasswordInput.value = "";
    },
    confirmUpdateRemotePassword: function() {
        this.$.updateRemotePasswordDialog.open = false;
        this.$.synchronizing.show();
        this.collection.save({
            source: this.remoteSource,
            password: this.collection.store.defaultSource.password,
            success: this.$.synchronizing.hide.bind(this.$.synchronizing),
            fail: function() {
                this.$.synchronizing.hide();
                this.alert("Failed to update remote password. Try again later!");
            }.bind(this)
        });
    },
    cancelUpdateRemotePassword: function() {
        this.$.updateRemotePasswordDialog.open = false;
    }
});