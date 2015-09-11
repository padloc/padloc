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
            },
            _categories: {
                type: Array,
                value: function() { return []; }
            }
        },
        listeners: {
            "open-form": "_openFormHandler",
            "alert": "_alertHandler",
            "notify": "_notify"
        },
        observers: [
            "_saveSettings(settings.*)",
            "_notifyHeaderTitle(_selected.name)"
        ],
        factoryImpl: function() {
            this.init.apply(this, arguments);
        },
        init: function(collection, settings) {
            this.collection = collection;
            this.collection.addEventListener("update", function(e) {
                e.detail.slice(2).forEach(function(record) {
                    // Add category to list
                    if (record.category && this._categories.indexOf(record.category) == -1) {
                        this.push("_categories", record.category);
                    }
                }.bind(this));
                this.splice.apply(this, ["_records"].concat(e.detail));
            }.bind(this));
            this.settings = settings;

            this.settings.fetch({success: this._notifySettings.bind(this)});

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

            // This is a workaround for a bug in Polymer where tap events sometimes fail to be generated
            // TODO: Remove as soon as this is fixed in Polymer
            document.addEventListener("touchstart", function() {}, false);
        },
        _initView: function(collExists) {
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            var view = collExists ? this.$.lockView : this.$.startView;

            // open the first view
            // this._openView(this.$.listView, { animation: "" });
            this._openView(view, { animation: "" });
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

                    if (this._records.filter(function(rec) { return !rec.removed; }).length > 10 &&
                            !this.settings.showed_backup_reminder) {
                        this._showBackupReminder();
                    }
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
            this._closeAllDialogs();
            if (this._currentView) {
                this._lastView = this._currentView != this.$.lockView ? this._currentView : null;
                this._currentView.hide({animation: ""});
                this._currentView = null;
            }
        },
        //* Locks the collection and opens the lock view
        _lock: function() {
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
            this._openForm([
                {element: "input", placeholder: "Enter Record Name", value: "", name: "name", autofocus: true},
                {element: "button", label: "Add", submit: true}
            ], "Add Record", this._confirmAddRecord.bind(this));
        },
        _confirmAddRecord: function(values) {
            var record = {
                name: values.name || "Unnamed",
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
            this._openView(this.$.settingsView);
        },
        _settingsBack: function() {
            this._openView(this.$.listView);
        },
        _openImportView: function() {
            this._openView(this.$.importView);
        },
        //* Add the records imported with the import view to the collection
        _imported: function(event, detail) {
            this._openView(this.$.listView);
            this.$.notification.show(detail.count + " records imported!", "success", 2000);
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
        //* Show an alert dialog with the provided message
        _alert: function(msg) {
            this._openForm([{element: "button", label: "OK", submit: true}], msg);
        },
        //* Keyboard shortcuts
        _keydown: function(event) {
            var shortcut;
            var dialogsOpen = !!Polymer.dom(this.root).querySelectorAll("padlock-dialog.open").length;

            // CTRL/CMD + F -> Filter
            if ((event.ctrlKey || event.metaKey) && event.keyCode === 70 &&
                    this._currentView.showFilter && !dialogsOpen) {
                shortcut = this.$.header.focusFilterInput.bind(this.$.header);
            }
            // DOWN -> Mark next
            else if (event.keyCode == 40 && !dialogsOpen) {
                shortcut = this._currentView.markNext && this._currentView.markNext.bind(this._currentView);
            }
            // UP -> Mark previous
            else if (event.keyCode == 38 && !dialogsOpen) {
                shortcut = this._currentView.markPrev && this._currentView.markPrev.bind(this._currentView);
            }
            // ENTER -> Select marked
            else if (event.keyCode == 13 && !dialogsOpen) {
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
            // CTRL/CMD + N -> New Record
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 78 && !dialogsOpen) {
                shortcut = this._currentView.add && this._currentView.add.bind(this._currentView);
            }
            // CTRL/CMD + S -> Synchronize
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 83 && !dialogsOpen) {
                shortcut = this._synchronize();
            }
            // CTRL/CMD + L -> Lock
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 76 && !dialogsOpen) {
                shortcut = this._lock();
            }
            // console.log(event.keyCode);

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
                if (rec.category == e.detail.previous) {
                    this.set("_records." + ind + ".category", e.detail.current);
                }
            }.bind(this));
        },
        //* Synchronizes the data with a remote source
        _synchronize: function(remotePassword) {
            // Ignore the remotePassword argument if it is not a string
            remotePassword = typeof remotePassword === "string" ? remotePassword : undefined;

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
                            this._promptUpdateRemotePassword();
                        } else {
                            this.$.notification.show("Synchronization successful!", "success", 2000);
                        }
                    }.bind(this),
                    fail: function(e) {
                        if (e && e.message && e.message.indexOf("CORRUPT: ccm: tag doesn't match") !== -1) {
                            // Decryption failed, presumably on the remote data. This means that the local master
                            // password does not match the one that was used for encrypting the remote data so
                            // we need to prompt the user for the correct password.
                            this._requireRemotePassword();
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
                this._openForm([
                    {element: "button", label: "Settings", tap: this._openSettings.bind(this), submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ], "You need to be connected to Padlock Cloud to synchronize your data.");
            }
        },
        _requireRemotePassword: function() {
            this._openForm([
                    {element: "input", name: "password", type: "password",
                        placeholder: "Enter Remote Password", autofocus: true},
                    {element: "button", label: "OK", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                "It seems your local master password does not match the one used to encrypt " +
                "the data on Padlock Cloud. Please enter your remote password!", function(vals) {
                    this._synchronize(vals.password);
                }.bind(this));
        },
        _promptUpdateRemotePassword: function() {
            this._openForm([
                    {element: "button", label: "Yes", submit: true},
                    {element: "button", label: "No", cancel: true}
                ],
                "Synchronization successful! Do you want to change the remote password to your local one?",
                this._updateRemotePassword.bind(this)
            );
        },
        _updateRemotePassword: function() {
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
        //* Back method. Chooses the right back method based on the current view
        _back: function() {
            var dialogsClosed = this._closeAllDialogs();

            if (!dialogsClosed) {
                // If we're in the list view, clear the filter input and restore the full list
                if (this._currentView == this.$.listView) {
                    if (this.$.header.filterActive) {
                        this.$.header.cancelFilter();
                    } else {
                        this._openMainMenu();
                    }
                } else {
                    this._currentView.back();
                }
            }
        },
        _closeAllDialogs: function() {
            var dialogs = Polymer.dom(this.root).querySelectorAll("padlock-dialog");
            var dialogsClosed = false;

            dialogs.forEach(function(dialog) {
                if (dialog.open) {
                    dialog.open = false;
                    var form = Polymer.dom(dialog).querySelector("padlock-dynamic-form");
                    if (form && typeof form.cancelCallback == "function") {
                        form.cancelCallback();
                    }
                    dialogsClosed = true;
                }
            });

            return dialogsClosed;
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
        _openStartView: function() {
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
            this.$.generatorView.field = e && e.detail.field;
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
            }, 100);
        },
        _openForm: function(components, title, submitCallback, cancelCallback) {
            var dialog = this.$.formDialog1.isShowing ? this.$.formDialog2 : this.$.formDialog1;
            var form = Polymer.dom(dialog).querySelector("padlock-dynamic-form");
            var titleEl = Polymer.dom(dialog).querySelector(".title");
            this.$.formDialog1.open = this.$.formDialog2.open = false;
            titleEl.innerHTML = title || "";
            form.components = components;
            form.submitCallback = submitCallback;
            form.cancelCallback = cancelCallback;
            platform.keyboardDisableScroll(false);
            this.async(function() {
                dialog.open = true;
                var input = form.querySelector("input[auto-focus]");
                if (input && !platform.isTouch()) {
                    input.focus();
                }
            }, 50);
        },
        _closeCurrentDialog: function(e) {
            e.currentTarget.open = false;
            // If no dialogs remain open, disable keyboard scroll again
            if (!Polymer.dom(this.root).querySelectorAll("padlock-dialog.open").length) {
                platform.keyboardDisableScroll(true);
            }
        },
        _formDismiss: function(e) {
            var form = Polymer.dom(e.target).querySelector("padlock-dynamic-form");
            form.blurInputElements();
            if (typeof form.cancelCallback == "function") {
                form.cancelCallback();
            }
            // If no dialogs remain open, disable keyboard scroll again
            if (!Polymer.dom(this.root).querySelectorAll("padlock-dialog.open").length) {
                platform.keyboardDisableScroll(true);
            }
        },
        _isEmpty: function(str) {
            return !str;
        },
        _openFormHandler: function(e) {
            this._openForm(e.detail.components, e.detail.title, e.detail.submit, e.detail.cancel);
        },
        _alertHandler: function(e) {
            this._alert(e.detail.message);
        },
        _displayShortcuts: function() {
            this._openForm(
                [
                    {element: "button", label: "[Esc] \u279e Back / Open Menu", submit: true},
                    {element: "button", label: "[ctrl/cmd] + F \u279e Find Record", submit: true},
                    {element: "button", label: "[ctrl/cmd] + N \u279e Create New", submit: true},
                    {element: "button", label: "[ctrl/cmd] + L \u279e Lock App", submit: true},
                    {element: "button", label: "[ctrl/cmd] + S \u279e Synchronize", submit: true},
                    {element: "button", label: "[\u2193] \u279e Mark Next Item", submit: true},
                    {element: "button", label: "[\u2191] \u279e Mark Previous Item", submit: true},
                    {element: "button", label: "[Enter] \u279e Select Marked Item", submit: true}
                ]
            );
        },
        _isTouch: function() {
            return platform.isTouch();
        },
        _notify: function(e) {
            this.$.notification.show(e.detail.message, e.detail.type, e.detail.duration);
        },
        _showBackupReminder: function() {
            this._openForm(
                [
                    {element: "button", label: "Export Data", close: true, tap: this._openExportView.bind(this)},
                    {element: "button", label: "Sync Data", close: true, tap: this._synchronize.bind(this)},
                    {element: "button", label: "Dismiss", close: true}
                ],
                "Have you backed up your data yet? Remember that by default your data is only stored " +
                "locally and may be lost if you uninstall Padlock, loose your device or accidentally " +
                "reset your data. You can backup your data by exporting it " +
                "or synching it with Padlock Cloud."
            );
            this.set("settings.showed_backup_reminder", new Date().getTime());
        }
    });

})(Polymer, padlock.platform, padlock.CloudSource);
