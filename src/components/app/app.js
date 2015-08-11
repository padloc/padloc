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
            document.addEventListener("resign", this._pause.bind(this), false);
            document.addEventListener("pause", this._pause.bind(this), false);

            // Init view when app resumes
            document.addEventListener("resume", this._initView.bind(this, true), false);
        },
        _initView: function(collExists) {
            var isTouch = platform.isTouch();
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            var view = collExists ? this.$.lockView : this.$.startView;

            // open the first view
            // this._openView(this.$.listView, { animation: "" });
            this._openView(view, { animation: "" });

            if (collExists && !isTouch) {
                this.async(view.focusPwdInput.bind(view), 10);
            }
        },
        _pwdEnter: function(event, detail) {
            this._unlock(detail.password);
        },
        _newPwd: function(event, detail) {
            this.collection.setPassword(detail.password);
            this._openView(
                this.$.listView,
                {animation: "popin", delay: 1500},
                {animation: "expand", delay: 500, easing: "cubic-bezier(1, -0.05, 0.9, 0.05)"}
            );

            this.async(function() {
                this.$.header.showing = true;
            }, 1500);
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
                this.$.decrypting.hide();
                this.decrypting = false;
                this._openView(
                    this._lastView || this.$.listView,
                    {animation: "popin", delay: 1500},
                    {animation: "expand", delay: 500, easing: "cubic-bezier(1, -0.05, 0.9, 0.05)"}
                );

                this.async(function() {
                    this.$.header.showing = true;
                }, 1500);

                this.async(function() {
                    if (this.settings.sync_connected && this.settings.sync_auto) {
                        this._synchronize();
                    }
                }, 2000);
            }.bind(this), fail: function() {
                this.$.notification.show("Wrong Password!", "error", 2000);
                this.$.decrypting.hide();
                this.decrypting = false;
            }.bind(this)});
        },
        _pause: function() {
            this.$.header.showing = false;
            if (this._currentView) {
                this._lastView = this._currentView != this.$.lockView ? this._currentView : null;
                this._currentView.hide({animation: ""});
                this._currentView = null;
            }
        },
        //* Locks the collection and opens the lock view
        _lock: function() {
            this.$.mainMenu.open = false;

            // Remove the stored password from the remote source if we've created on yet
            if (this.remoteSource) {
                delete this.remoteSource.password;
            }

            this._lastView = this._currentView;

            this.$.header.showing = false;
            this._openView(
                this.$.lockView,
                {animation: "contract", easing: "cubic-bezier(0.8, 0, 0.2, 1.2)", delay: 300},
                {animation: "popout"}
            );
            setTimeout(this.collection.clear.bind(this.collection), 500);
        },
        //* Change handler for the _selected property; Opens the record view when record is selected
        _selectedChanged: function() {
            if (this._selected) {
                this._openView(this.$.recordView);
                this.$.header.blurFilterInput();
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
                this.async(view.show.bind(view, inOpts), inOpts.delay || 100);
                this.async(this._currentView.hide.bind(this._currentView, outOpts), outOpts.delay || 0);
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
                name: this.$.addInput.value || "Unnamed",
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
            this._openView(this.$.listView);
            this.$.notification.show(detail.records.length + " records imported!", "success", 2000);
            // Auto sync
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this._synchronize();
            }
        },
        _importBack: function() {
            this._openView(this.$.listView);
        },
        _openExportView: function() {
            this._openView(this.$.exportView);
        },
        _exportBack: function() {
            this._openView(this.$.listView);
        },
        //* Triggers the headers scrim to match the scrim of the opened dialog
        _dialogOpen: function() {
            this.$.header.scrim = true;
        },
        //* Removes the headers scrim
        _dialogClose: function() {
            this.$.header.scrim = false;
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

            // CTRL/CMD + F -> Filter
            if ((event.ctrlKey || event.metaKey) && event.keyCode === 70 &&
                    this._currentView.showFilter) {
                shortcut = this.$.header.focusFilterInput.bind(this.$.header);
            }
            // DOWN -> Mark next
            else if (event.keyCode == 40) {
                shortcut = this._currentView.markNext && this._currentView.markNext.bind(this._currentView);
            }
            // UP -> Mark previous
            else if (event.keyCode == 38) {
                shortcut = this._currentView.markPrev && this._currentView.markPrev.bind(this._currentView);
            }
            // ENTER -> Select marked
            else if (event.keyCode == 13) {
                shortcut = this._currentView.selectMarked && this._currentView.selectMarked.bind(this._currentView);
            }
            // ESCAPE -> Back
            else if (event.keyCode == 27) {
                shortcut = this._back.bind(this);
            }
            // CTRL/CMD + C -> Copy
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 67) {
                shortcut = this._currentView.copyToClipboard &&
                    this._currentView.copyToClipboard.bind(this._currentView);
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
                var equalsOld = rec.category == e.detail.prev.name;
                var equalsNew = e.detail.curr.name && rec.category == e.detail.curr.name;
                if (equalsOld || equalsNew) {
                    if (equalsNew) {
                        // This is necessary in order to make sure that some computed bindings are updated
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
                        } else {
                            this.$.notification.show("Synchronization successful!", "success", 2000);
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
                success: function() {
                    this.$.synchronizing.hide();
                    this.$.notification.show("Remote password updated!", "success", 2000);
                }.bind(this),
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
                this.$.header.cancelFilter();
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
            this.$.header.showing = false;
            this._openView(
                this.$.startView,
                {animation: "contract", easing: "cubic-bezier(0.8, 0, 0.2, 1.2)", delay: 300},
                {animation: "popout"}
            );
        },
        _recordSelected: function(e) {
            this.$.selector.select(e.detail.record);
        },
        _notifyHeaderTitle: function() {
            this.notifyPath("_currentView.headerTitle", this._currentView && this._currentView.headerTitle);
        },
        _notifyHeaderIcons: function() {
            this.notifyPath("_currentView.leftHeaderIcon", this._currentView && this._currentView.leftHeaderIcon);
            this.notifyPath("_currentView.rightHeaderIcon", this._currentView && this._currentView.rightHeaderIcon);
        },
        _openGenerator: function(e) {
            this.$.mainMenu.open = false;
            this.$.generatorView.field = e.detail.field;
            if (this.$.generatorView.field) {
                this._openView(this.$.generatorView, {animation: "slideInFromBottom"}, {animation: "slideOutToBottom"});
            } else {
                this._openView(this.$.generatorView);
            }
        },
        _generatorBack: function() {
            if (this.$.generatorView.field) {
                this._openView(this.$.recordView, {animation: "slideInFromBottom"}, {animation: "slideOutToBottom"});
            } else {
                this._openView(this.$.listView);
            }
        },
        _generateConfirm: function(e) {
            this._generatorBack();
            this.async(function() {
                this.$.recordView.generateConfirm(e.detail.field, e.detail.value);
            }, 500);
        }
    });

})(Polymer, padlock.platform, padlock.CloudSource);
