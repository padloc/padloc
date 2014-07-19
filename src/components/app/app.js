Polymer("padlock-app", {
    observe: {
        "settings.order_by": "saveSettings"
    },
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

        // Prevent native mousedown behavior on iOS to avoid some quirks
        if (require("padlock/platform").isIOS()) {
            document.addEventListener("mousedown", this.preventDefault.bind(this), false);
        }

        // Listen for android back button
        document.addEventListener("backbutton", this.back.bind(this));
    },
    initView: function(collExists) {
        // If there already is data in the local storage ask for password
        // Otherwise start with choosing a new one
        var initialView = collExists ? this.$.lockView : this.$.passwordView;

        // open the first view
        this.openView(initialView, {
            animation: "floatUp",
            duration: 1000
        });
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
        if (this.decrypting) {
            // We're already busy decrypting the data, so no unlocking right now!
            return;
        }
        this.decrypting = true;
        this.$.decrypting.show();
        this.collection.fetch({password: password, success: function() {
            this.$.lockView.errorMessage = null;
            this.$.lockView.enterLocked = false;
            this.openView(this.$.listView);
            this.$.decrypting.hide();
            this.decrypting = false;
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this.synchronize();
            }
        }.bind(this), fail: function() {
            this.$.lockView.errorMessage = "Wrong password!";
            this.$.lockView.enterLocked = false;
            this.$.decrypting.hide();
            this.decrypting = false;
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
            animation: "floatUp",
            duration: 1000
        }, {
            endCallback: this.collection.clear.bind(this.collection)
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
    openView: function(view, inOpts, outOpts) {
        var views = this.shadowRoot.querySelectorAll(".view").array(),
            // Choose left or right animation based on the order the views
            // are included in the app
            back = views.indexOf(view) < views.indexOf(this.currentView);

        // Unless otherwise specified, use a right-to-left animation when navigating 'forward'
        // and a left-to-right animation when animating 'back'
        inOpts = inOpts || {};
        if (!("animation" in inOpts)) {
            inOpts.animation = back ? "slideInFromLeft": "slideInFromRight";
        }
        outOpts = outOpts || {};
        if (!("animation" in outOpts)) {
            outOpts.animation = back ? "slideOutToRight": "slideOutToLeft";
        }

        // Hide current view (if any)
        if (this.currentView) {
            // Wait until the out animation has started before starting the in animation
            outOpts.startCallback = view.show.bind(view, inOpts);
            this.currentView.hide(outOpts);
        } else {
            view.show(inOpts);
        }
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
    preventDefault: function() {
        event.preventDefault();
        event.stopPropagation();
    },
    //* Keyboard shortcuts
    keydown: function(event) {
        var shortcut;

        // CTRL/CMD + F -> Filter
        if ((event.ctrlKey || event.metaKey) && event.keyCode === 70) {
            shortcut = this.$.header.focusFilterInput.bind(this.$.header);
        }
        // DOWN -> Mark next
        else if (event.keyCode == 40) {
            if (this.currentView.markNext) {
                shortcut = this.currentView.markNext.bind(this.currentView);
            }
        }
        // UP -> Mark previous
        else if (event.keyCode == 38) {
            if (this.currentView.markPrev) {
                shortcut = this.currentView.markPrev.bind(this.currentView);
            }
        }
        // ENTER -> Select marked
        else if (event.keyCode == 13) {
            if (this.currentView.selectMarked) {
                shortcut = this.currentView.selectMarked.bind(this.currentView);
            }
        }
        // ESCAPE -> Back
        else if (event.keyCode == 27) {
            shortcut = this.back.bind(this);
        }
        // CTRL/CMD + C -> Copy
        else if ((event.ctrlKey || event.metaKey) && event.keyCode === 67 && this.currentView == this.$.recordView) {
            shortcut = this.$.recordView.copyToClipboard.bind(this.$.recordView);
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
        this.openView(this.$.categoriesView, {animation: ""}, {animation: "slideOutToBottom"});
    },
    categoriesDone: function() {
        this.openView(this.$.recordView, {
            animation: "slideInFromBottom",
            endCallback: this.saveRecord.bind(this)
        }, {
            animation: "fadeOut"
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
                    if (remotePassword !== undefined && this.collection.defaultPassword !== remotePassword) {
                        this.$.updateRemotePasswordDialog.open = true;
                    }
                }.bind(this),
                fail: function(e) {
                    if (e && e.message && e.message.indexOf("CORRUPT: ccm: tag doesn't match") !== -1) {
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
            password: this.collection.defaultPassword,
            success: this.$.synchronizing.hide.bind(this.$.synchronizing),
            fail: function() {
                this.$.synchronizing.hide();
                this.alert("Failed to update remote password. Try again later!");
            }.bind(this)
        });
    },
    cancelUpdateRemotePassword: function() {
        this.$.updateRemotePasswordDialog.open = false;
    },
    //* Back method. Chooses the right back method based on the current view
    back: function() {
        this.currentView.back();
        var dialogs = this.shadowRoot.querySelectorAll("padlock-dialog");
        Array.prototype.forEach.call(dialogs, function(dialog) {
            dialog.open = false;
        });
    },
    saveSettings: function() {
        this.settings.save();
    },
    trackStart: function(event) {
        event.preventTap();
    }
});