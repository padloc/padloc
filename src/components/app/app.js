/* jshint browser: true */
/* global Polymer, padlock */

padlock.App = (function(Polymer, platform, CloudSource) {
    "use strict";

    return Polymer({
        is: "padlock-app",
        properties: {
            settings: Object,
            categories: Object,
            collection: Object,
            _filterString: String,
            _selected: {
                type: Object,
                observer: "_selectedChanged"
            },
            _currentView: Object,
            _records: {
                type: Array,
                value: function() { return []; }
            }
        },
        listeners: {
            open: "_dialogOpen",
            close: "_dialogClose"
        },
        observers: [
            "_saveSettings(settings.*)",
            "_notifyHeaderTitle(_selected.name)"
        ],
        factoryImpl: function() {
            this.init.apply(this, arguments);
        },
        init: function(collection, settings, categories) {
            this.collection = collection;
            this.collection.addEventListener("update", function(e) {
                e.detail.slice(2).forEach(function(record) {
                    // Recent changes require that the category property be not undefined
                    if (!record.removed && !record.category) {
                        record.category = "";
                    }
                    // Add any categories that are not registered yet
                    if (record.category && !this.categories.get(record.category)) {
                        this.categories.set(record.category, this.categories.autoColor());
                    }
                }.bind(this));
                this.categories.save();
                this.splice.apply(this, ["_records"].concat(e.detail));
            }.bind(this));
            this.settings = settings;
            this.categories = categories;

            this.settings.fetch({success: this._notifySettings.bind(this)});

            this.categories.fetch();

            this.collection.exists({success: this._initView.bind(this), fail: this._initView.bind(this, false)});

            // If we want to capture all keydown events, we have to add the listener
            // directly to the document
            document.addEventListener("keydown", this._keydown.bind(this), false);

            // Listen for android back button
            document.addEventListener("backbutton", this._back.bind(this), false);

            // Lock app when it goes into the background
            document.addEventListener("resign", this._lock.bind(this), false);
            document.addEventListener("pause", this._lock.bind(this), false);
        },
        _initView: function(collExists) {
            var isTouch = platform.isTouch();
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            this.$.shutter.startMode = !collExists;
            if (collExists && !isTouch) {
                setTimeout(this.$.shutter.focusPwdInput.bind(this.$.shutter), 10);
            }

            // open the first view
            this._openView(this.$.listView, { animation: "" });
        },
        _pwdEnter: function(event, detail) {
            this._unlock(detail.password);
        },
        _newPwd: function(event, detail) {
            this.collection.setPassword(detail.password);
            this.$.shutter.open = true;
            setTimeout(function() {
                this.$.shutter.startMode = false;
            }.bind(this), 500);
        },
        //* Tries to unlock the current collection with the provided password
        _unlock: function(password) {
            if (this.decrypting) {
                // We're already busy decrypting the data, so no unlocking right now!
                return;
            }
            this.decrypting = true;
            this.$.decrypting.show();
            this.collection.fetch({password: password, success: function() {
                this.$.shutter.errorMessage = "";
                this.$.shutter.enterLocked = false;
                this.$.decrypting.hide();
                this.decrypting = false;
                setTimeout(function() {
                    if (this.settings.sync_connected && this.settings.sync_auto) {
                        this._synchronize();
                    }
                    this.$.shutter.open = true;
                }.bind(this), 100);
            }.bind(this), fail: function() {
                this.$.shutter.errorMessage = "Wrong password!";
                this.$.shutter.enterLocked = false;
                this.$.decrypting.hide();
                this.decrypting = false;
            }.bind(this)});
        },
        //* Locks the collection and opens the lock view
        _lock: function() {
            this.$.mainMenu.open = false;

            // Remove the stored password from the remote source if we've created on yet
            if (this.remoteSource) {
                delete this.remoteSource.password;
            }

            this.$.shutter.open = false;
            setTimeout(this.collection.clear.bind(this.collection), 500);
        },
        //* Change handler for the _selected property; Opens the record view when record is selected
        _selectedChanged: function() {
            if (this._selected) {
                this._openView(this.$.recordView);
                this.$.shutter.blurFilterInput();
            }
        },
        /**
         * Opens the provided _view_
         */
        _openView: function(view, inOpts, outOpts) {
            var views = Polymer.dom(this.root).querySelectorAll(".view"),
                // Choose left or right animation based on the order the views
                // are included in the app
                back = views.indexOf(view) < views.indexOf(this._currentView);

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
            if (this._currentView) {
                // Start the in animation after a small delay
                setTimeout(view.show.bind(view, inOpts), 100);
                this._currentView.hide(outOpts);
            } else {
                view.show(inOpts);
            }
            this._currentView = view;
        },
        //* Saves changes to the currently selected record (if any)
        _saveRecord: function() {
            var record = this._selected;
            if (record) {
                // Save the changes
                this.collection.save({record: record});
                if (this.settings.sync_connected && this.settings.sync_auto) {
                    this._synchronize();
                }
            }
        },
        //* Opens the dialog for adding a new record
        _addRecord: function() {
            this.$.addInput.value = "";
            this.$.addDialog.open = true;
            // this.$.addInput.focus();
        },
        _confirmAddRecord: function() {
            this.$.addDialog.open = false;
            var record = {
                name: this.$.addInput.value,
                fields: this.settings.default_fields.map(function(field) {
                    return {name: field, value: ""};
                }),
                category: ""
            };

            this.collection.add(record);

            // select the newly added record (which will open the record view)
            this.$.selector.select(record);
            this._saveRecord();
        },
        //* Deletes the currently selected record (if any)
        _deleteRecord: function() {
            this.collection.remove(this._selected);
            this.collection.save();
            this.notifyPath("_selected.removed", true);
            this._recordViewBack();
            // Auto sync
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this._synchronize();
            }
        },
        _recordViewBack: function() {
            this._openView(this.$.listView, null, {
                endCallback: function() {
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        _openMainMenu: function() {
            this.$.mainMenu.open = true;
        },
        _openSettings: function() {
            this.$.mainMenu.open = false;
            this.$.notConnectedDialog.open = false;
            this._openView(this.$.settingsView);
        },
        _settingsBack: function() {
            this._openView(this.$.listView);
        },
        _openImportView: function() {
            this._openView(this.$.importView);
        },
        //* Add the records imported with the import view to the collection
        _saveImportedRecords: function(event, detail) {
            this.collection.add(detail.records);
            this.collection.save();
            this._alert(detail.records.length + " records imported!");
            this._openView(this.$.listView);
            // Auto sync
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this._synchronize();
            }
        },
        _importBack: function() {
            this._openView(this.$.listView);
        },
        //* Triggers the headers scrim to match the scrim of the opened dialog
        _dialogOpen: function() {
            this.$.shutter.scrim = true;
        },
        //* Removes the headers scrim
        _dialogClose: function() {
            this.$.shutter.scrim = false;
        },
        //* Show an alert dialog with the provided message
        _alert: function(msg) {
            this.$.alertText.innerHTML = msg;
            this.$.alertDialog.open = true;
        },
        _dismissAlert: function() {
            this.$.alertDialog.open = false;
        },
        //* Keyboard shortcuts
        _keydown: function(event) {
            var shortcut;

            // If the shutter is closed, ignore all shortcuts
            if (!this.$.shutter.open) {
                return;
            }

            // CTRL/CMD + F -> Filter
            if ((event.ctrlKey || event.metaKey) && event.keyCode === 70 && this._currentView.headerOptions.showFilter) {
                shortcut = this.$.shutter.focusFilterInput.bind(this.$.shutter);
            }
            // DOWN -> Mark next
            else if (event.keyCode == 40) {
                if (this._currentView.markNext) {
                    shortcut = this._currentView.markNext.bind(this._currentView);
                }
            }
            // UP -> Mark previous
            else if (event.keyCode == 38) {
                if (this._currentView.markPrev) {
                    shortcut = this._currentView.markPrev.bind(this._currentView);
                }
            }
            // ENTER -> Select marked
            else if (event.keyCode == 13) {
                if (this._currentView.selectMarked) {
                    shortcut = this._currentView.selectMarked.bind(this._currentView);
                }
            }
            // ESCAPE -> Back
            else if (event.keyCode == 27) {
                shortcut = this._back.bind(this);
            }
            // CTRL/CMD + C -> Copy
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 67 &&
                this._currentView == this.$.recordView) {
                shortcut = this.$.recordView.copyToClipboard.bind(this.$.recordView);
            }

            // If one of the shortcuts matches, execute it and prevent the default behaviour
            if (shortcut) {
                shortcut();
                event.preventDefault();
            }
        },
        _openCategories: function() {
            this._openView(this.$.categoriesView, {animation: "slideInFromBottom"}, {animation: "slideOutToBottom"});
        },
        _categoriesDone: function() {
            this._openView(this.$.recordView, {
                animation: "slideInFromBottom",
                endCallback: this._saveRecord.bind(this)
            }, {
                animation: "slideOutToBottom"
            });
        },
        _categoryChanged: function(e) {
            this._records.forEach(function(rec, ind) {
                if (rec.category == e.detail.prev.name) {
                    // This is necessary in order to make sure that some computed bindings are updated
                    if (e.detail.curr.name == e.detail.prev.name) {
                        this.notifyPath("_records." + ind + ".category", "");
                    }

                    this.set("_records." + ind + ".category", e.detail.curr.name);
                }
            }.bind(this));
        },
        //* Synchronizes the data with a remote source
        _synchronize: function(remotePassword) {
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
                            this._alert(msg);
                        }
                        this.$.synchronizing.hide();
                    }.bind(this)
                });
            } else {
                this.$.notConnectedDialog.open = true;
            }
        },
        _dismissNotConnectedDialog: function() {
            this.$.notConnectedDialog.open = false;
        },
        _remotePasswordEntered: function() {
            this.$.remotePasswordDialog.open = false;
            this._synchronize(this.$.remotePasswordInput.value);
            this.$.remotePasswordInput.value = "";
        },
        _confirmUpdateRemotePassword: function() {
            this.$.updateRemotePasswordDialog.open = false;
            this.$.synchronizing.show();
            this.collection.save({
                source: this.remoteSource,
                password: this.collection.defaultPassword,
                success: this.$.synchronizing.hide.bind(this.$.synchronizing),
                fail: function() {
                    this.$.synchronizing.hide();
                    this._alert("Failed to update remote password. Try again later!");
                }.bind(this)
            });
        },
        _cancelUpdateRemotePassword: function() {
            this.$.updateRemotePasswordDialog.open = false;
        },
        //* Back method. Chooses the right back method based on the current view
        _back: function() {
            this._currentView.back();
            var dialogs = Polymer.dom(this.root).querySelectorAll("padlock-dialog");
            Array.prototype.forEach.call(dialogs, function(dialog) {
                dialog.open = false;
            });

            // If we're in the list view, clear the filter input and restore the full list
            if (this._currentView == this.$.listView) {
                this.$.shutter.cancelFilter();
            }
        },
        _saveSettings: function() {
            if (this.settings.loaded) {
                this.settings.save();
            }
        },
        _notifySettings: function() {
            for (var prop in this.settings.properties) {
                this.notifyPath("settings." + prop, this.settings[prop]);
            }
        },
        _reset: function() {
            this.$.shutter.startMode = true;
            this.$.shutter.open = false;
            this._openView(this.$.listView, {animation: ""}, {animation: ""});
        },
        _recordSelected: function(e) {
            this.$.selector.select(e.detail.record);
        },
        _notifyHeaderTitle: function() {
            this.notifyPath("_currentView.headerTitle", this._currentView && this._currentView.headerTitle);
        }
    });

})(Polymer, padlock.platform, padlock.CloudSource);
