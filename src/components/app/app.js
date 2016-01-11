/* jshint browser: true */
/* global Polymer, padlock */

/**
 * Top-level component for rendering application interface. Requires a `padlock.Collection` and
 * `padlock.Settings` object to be passed into the constructor as dependencies.
 */
padlock.App = (function(Polymer, platform, pay) {
    "use strict";

    return Polymer({
        is: "padlock-app",
        properties: {
            //* `padlock.Settings` object handling application settings
            settings: Object,
            //* `padlock.Collection object holding main user data
            collection: Object,
            //* String used to filter record list
            _filterString: String,
            //* Currently selected record (will be opened in record view)
            _selected: {
                type: Object,
                observer: "_selectedChanged"
            },
            //* View that is currently active
            _currentView: Object,
            //* Array of records which acts as a data binding proxy for the data from the `collection` object
            _records: {
                type: Array,
                value: function() { return []; }
            },
            //* Array of categories, which is managed during runtime by aggregating the `category` properties
            //* of all records
            _categories: {
                type: Array,
                value: function() { return []; }
            }
        },
        listeners: {
            "open-form": "_openFormHandler",
            "alert": "_alertHandler",
            "notify": "_notify",
            "error": "_errorHandler",
            "buy-subscription": "_buySubscription"
        },
        observers: [
            "_saveSettings(settings.*)",
            "_notifyHeaderTitle(_selected.name)"
        ],
        // This is called by the constructor with the same arguments passed into the constructor
        factoryImpl: function() {
            this.init.apply(this, arguments);
        },
        //* Initialize application with a `padlock.Collection` and `padlock.Settings` object
        init: function(collection, settings) {
            this.collection = collection;
            // Wire up the collection object with the `_records` binding proxy by subscribing to the `update`
            // event
            this.collection.addEventListener("update", function(e) {
                // Starting from the 3rd arguments, all passed in arguments are added records
                e.detail.slice(2).forEach(function(record) {
                    // Add category to `_categories` list in case it is not there yet
                    if (record.category && this._categories.indexOf(record.category) == -1) {
                        this.push("_categories", record.category);
                    }
                }.bind(this));
                // We need to use the `splice` api to make sure that the `repeat` template picks up the change
                this.splice.apply(this, ["_records"].concat(e.detail));
            }.bind(this));

            this.settings = settings;
            // Fetch settings from persistent storage
            this.settings.fetch({success: this._notifySettings.bind(this)});

            this.remoteSource = new padlock.CloudSource(this.settings);

            // Check if collection data already exists in persistent storage. If no, that means that means that
            // we are starting with a 'clean slate' and have to set a master password first
            this.collection.exists({success: this._initView.bind(this), fail: this._initView.bind(this, false)});

            // If we want to capture all keydown events, we have to add the listener
            // directly to the document
            document.addEventListener("keydown", this._keydown.bind(this), false);

            // Listen for android back button
            document.addEventListener("backbutton", this._back.bind(this), false);

            // Lock app when it goes into the background
            document.addEventListener("pause", this._pause.bind(this), false);

            // Init view when app resumes
            document.addEventListener("resume", this._resume.bind(this, true), false);

            // This is a workaround for a bug in Polymer where tap events sometimes fail to be generated
            // TODO: Remove as soon as this is fixed in Polymer
            document.addEventListener("touchstart", function() {}, false);

            pay.addEventListener("purchased", function() {
                pay.verifySubscription(this.settings.sync_email);
            }.bind(this));

            pay.addEventListener("verified", function() {
                if (!this.settings.sync_connected) {

                }
                var actions = this.settings.sync_connected ? [
                    {element: "button", label: "Synchronize Now", tap: this._synchronize.bind(this), submit: true},
                    {element: "button", label: "Dismiss", cancel: true}
                ] : [
                    {element: "button", label: "Connect Now", tap: function() {
                        this._openCloudView();
                        this.async(function() {
                            this.$.cloudView.requestAuthToken({
                                email: this.settings.sync_email,
                                create: true
                            });
                        }, 100);
                    }.bind(this), submit: true},
                    {element: "button", label: "Dismiss", cancel: true}
                ];
                this._openForm(
                    actions,
                    "Good news! We have just verified you Padlock Cloud subscription. You can now start using it " +
                    "on this device!"
                );
            }.bind(this));
        },
        _initView: function(collExists) {
            // If there already is data in the local storage ask for password
            // Otherwise start with choosing a new one
            var view = collExists ? this.$.lockView : this.$.startView;

            // open the first view
            // this._openView(this.$.listView, { animation: "" });
            this._openView(view, { animation: "" });
        },
        // Enter handler for lock view; triggers unlock attempt
        _pwdEnter: function(event, detail) {
            this._unlock(detail.password);
        },
        _changePwd: function() {
            this._openStartView(true);
        },
        _popinOpen: function(view) {
            this._openView(
                view,
                {animation: "popin", delay: 1500},
                {animation: "expand", delay: 500, easing: "cubic-bezier(1, -0.05, 0.9, 0.05)"}
            );

            // Show header with a slight delay
            this.async(function() {
                this.$.header.showing = true;
            }, 1500);
        },
        // Submit handler for start view. A new master password was selected so we have to update it
        _newPwd: function(event, detail) {
            // Update master password
            this.collection.setPassword(detail.password);
            // Navigate to list view
            this._popinOpen(this.$.listView);
        },
        _restored: function() {
            this._popinOpen(this.$.listView);
        },
        //* Tries to unlock the current collection with the provided password
        _unlock: function(password) {
            if (this._decrypting) {
                // We're already busy decrypting the data, so no unlocking right now!
                return;
            }

            // set flag to indicate that decryption is in process
            this._decrypting = true;
            // show progress indicator
            this.$.decrypting.show();
            // Attempt to fetch data from storage and decrypt it
            this.collection.fetch({password: password, rememberPassword: true, success: function() {
                // Hide progress indicator
                this.$.decrypting.hide();
                // We're done decrypting so, reset the `_decrypting` flag
                this._decrypting = false;
                // Show either the last view shown before locking the screen or default to the list view
                this._popinOpen(this._lastView || this.$.listView);
                // After a short delay, trigger synchronization if auto-sync is enabled
                this.async(function() {
                    // If there is more than ten records in the collection and no backup reminder has been
                    // shown, show it.
                    if (
                        !this.settings.sync_connected &&
                        this._records.filter(function(rec) { return !rec.removed; }).length > 10 &&
                        !this.settings.showed_backup_reminder
                    ) {
                        this._showBackupReminder();
                    }

                    if (this.settings.sync_connected && this.settings.sync_auto) {
                        this._synchronize();
                    }
                }, 2000);
            }.bind(this), fail: function() {
                // Fetching/decrypting the data failed. This can have multiple reasons but by far the most
                // likely is that the password was incorrect, so that is what we tell the user.
                this.$.notification.show("Wrong Password!", "error", 2000);
                // Hide progress indicator
                this.$.decrypting.hide();
                // We're done decrypting so, reset the `_decrypting` flag
                this._decrypting = false;
            }.bind(this)});
        },
        // Handler for cordova `pause` event. Usually triggered when the app goes into the background.
        // Hides the header, closes all dialogs and unless we're currently on the lock or start view, hide
        // the current view. This is meant to achive two things:
        //
        // 1. To access the data, the master password has to be entered again. This prevents other people from
        // picking up the devise and snooping through the users data
        // 2. Any sensitive data currently displayed on the screen is hidden so it is not visible when browsing
        // apps using multitasking / app switcher.
        // TODO: #2 currently fails in iOS 9
        _pause: function() {
            // Hide header
            this.$.header.showing = false;
            // Close all currently opened dialogs
            this._closeAllDialogs();
            // If not currently on the lock or start view, navigate to lock view while remembering the current view
            // so we can navigate back to it later
            if (this._currentView && this._currentView != this.$.lockView && this._currentView != this.$.startView) {
                this._lastView = this._currentView;
                this._currentView.hide({animation: ""});
                this._currentView = null;
            }
        },
        // Handler for cordova `resume` event. Calls the `_initView` method which in this case will show
        // the lock screen for reauthentication (unless we're already in the lock or start view in which
        // case we do nothing
        _resume: function() {
            if (this._currentView != this.$.lockView && this._currentView != this.$.startView) {
                this._initView(true);
            }
        },
        //* Locks the collection and opens the lock view
        _lock: function() {
            // Remember current view so we can navigate back to it after unlocking the app again
            // TODO: Does this make sense in case of the record view, since we're trying to remove all
            // data from memory and the record view will be displaying on of the records?
            this._lastView = this._currentView;

            // Hide header
            this.$.header.showing = false;
            // Navigate to lock view
            this._openView(
                this.$.lockView,
                {animation: "contract", easing: "cubic-bezier(0.8, 0, 0.2, 1.2)", delay: 300},
                {animation: "popout"}
            );
            // Wait for a bit for the animation to finish, then clear the collection data from memory
            setTimeout(this.collection.clear.bind(this.collection), 500);
        },
        //* Change handler for the _selected property; Opens the record view when record is selected
        _selectedChanged: function() {
            if (this._selected) {
                // Open record view (which is bound to the currently selected record)
                this._openView(this.$.recordView);
                // Blur filter input to hide the keyboard in case it is showing right now
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
                // If auto-sync is enabled, sync after each save
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
        // Confirmation method for adding a new record. Creates the record object and adds it to the collection
        _confirmAddRecord: function(values) {
            var record = {
                // Default record name to 'Unnamed'
                name: values.name || "Unnamed",
                // Add default fields specified in settings
                fields: this.settings.default_fields.map(function(field) {
                    return {name: field, value: ""};
                }),
                category: ""
            };

            this.collection.add(record);

            // select the newly added record (which will open the record view)
            this.$.selector.select(record);
            // save the newly create record
            this._saveRecord();
        },
        // Deletes the currently selected record (if any)
        _deleteRecord: function() {
            this.collection.remove(this._selected);
            this.collection.save();
            // Notify the element that the `removed` property of the selected record has changed, which
            // will cause the list to be rerendered without the item
            this.notifyPath("_selected.removed", true);
            // Close record view since that is where the record was deleted
            this._recordViewBack();
            // Auto sync
            if (this.settings.sync_connected && this.settings.sync_auto) {
                this._synchronize();
            }
        },
        // Navigate back from record view by opening list view
        _recordViewBack: function() {
            this._openView(this.$.listView, null, {
                endCallback: function() {
                    // after the animation has finished, deselect the currently selected record
                    this.$.selector.deselect();
                }.bind(this)
            });
        },
        //
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
        _openCloudView: function() {
            this._openView(this.$.cloudView);
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
        _openExportView: function() {
            this._openView(this.$.exportView);
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
                shortcut = this._selectMarkedRecord.bind(this);
            }
            // ESCAPE -> Back
            else if (event.keyCode == 27 && !padlock.currentInput) {
                shortcut = this._back.bind(this);
            }
            // CTRL/CMD + C -> Copy
            else if ((event.ctrlKey || event.metaKey) && event.keyCode === 67 && !padlock.currentInput) {
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
        // Handler for when the category of a record has changed. Basically, when the category name of a
        // record is changed, we assume that all other records with the same original category name should
        // be updated as well, so that's what we're doing.
        _categoryChanged: function(e) {
            this._records.forEach(function(rec, ind) {
                if (rec.category == e.detail.previous) {
                    this.set("_records." + ind + ".category", e.detail.current);
                }
            }.bind(this));
        },
        /**
         * Synchronizes the data with a remote source
         * @param {String} remotePassword Password for the remote source in case it is different from the local one
         */
        _synchronize: function(remotePassword) {
            // Ignore the remotePassword argument if it is not a string
            remotePassword = typeof remotePassword === "string" ? remotePassword : undefined;

            // Check if the user has connected the client to the cloud already.
            // If not, prompt him to do so
            if (this.settings.sync_connected) {
                // Show progress indicator
                this.$.synchronizing.show();

                // Start synchronization
                this.collection.sync(this.remoteSource, {
                    // The password for the remote source might be different from the local one so if that's
                    // the case, provide that password explicitly
                    remotePassword: remotePassword,
                    success: function() {
                        this.$.synchronizing.hide();

                        // If we explicitly used a different password for the remote source than for the local source,
                        // ask the user if he wants to update the remote password
                        if (remotePassword !== undefined && this.collection.defaultPassword !== remotePassword) {
                            this._promptUpdateRemotePassword();
                        } else {
                            this.$.notification.show("Synchronization successful!", "success", 2000);
                        }
                    }.bind(this),
                    fail: function(e) {
                        switch(e) {
                            case padlock.ERR_STORE_DECRYPT:
                                // Decryption failed, presumably on the remote data. This means that the local master
                                // password does not match the one that was used for encrypting the remote data so
                                // we need to prompt the user for the correct password.
                                this._requireRemotePassword();
                                break;
                            case padlock.ERR_CLOUD_SUBSCRIPTION_REQUIRED:
                                this.set("settings.sync_readonly", true);
                                this._alertReadonly();
                                break;
                            default:
                                this._handleError(e);
                        }

                        // Hide progress indicator
                        this.$.synchronizing.hide();
                    }.bind(this)
                });
            } else {
                var msg = this.settings.sync_key ?
                    "It seems you have not completed the connection process for Padlock Cloud yet! Go to " +
                    "Settings > Padlock Cloud for more information!" :
                    "You need to be connected to Padlock Cloud to synchronize your data. " +
                    "Go to Settings > Padlock Cloud for more information!";
                // User has not connected to Padlock Cloud yet so we're prompting them to do so
                this._openForm([
                    {element: "button", label: "Open Padlock Cloud Settings",
                        tap: this._openCloudView.bind(this), submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ], msg);
            }
        },
        // Prompts for the password to use for the remote source
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
        // Asks if the user wants to update the remote password with the local one
        _promptUpdateRemotePassword: function() {
            this._openForm([
                    {element: "button", label: "Yes", submit: true},
                    {element: "button", label: "No", cancel: true}
                ],
                "Synchronization successful! Do you want to change the remote password to your local one?",
                this._updateRemotePassword.bind(this)
            );
        },
        // Updates the remote password with the local one
        _updateRemotePassword: function() {
            // Show progress indicator
            this.$.synchronizing.show();
            // Update remote password by overwriting the remote data with data encrypted with the local password
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
        /**
         * Closes all currently open dialogs
         * @returns {Boolean} A boolean indicating whether any dialogs where closed
         */
        _closeAllDialogs: function() {
            var dialogs = Polymer.dom(this.root).querySelectorAll("padlock-dialog");
            var dialogsClosed = false;

            dialogs.forEach(function(dialog) {
                if (dialog.open) {
                    dialog.open = false;
                    // In case the dialog contains a dynamic form, call the associated cancel callback
                    var form = Polymer.dom(dialog).querySelector("padlock-dynamic-form");
                    if (form && typeof form.cancelCallback == "function") {
                        form.cancelCallback();
                    }
                    dialogsClosed = true;
                }
            });

            return dialogsClosed;
        },
        // Saves the settings to persistent storage
        _saveSettings: function() {
            // Only save if the the data has actually been loaded from persistent storage yet. This check is
            // to prevent settings data being overwritten with default values on app startup
            if (this.settings.loaded) {
                this.settings.save();
            }
        },
        // Notify observers of changes to every existing settings property. This is used as a catch-all
        // notification mechanism to update bindings in case the where not notified through other channels
        _notifySettings: function() {
            for (var prop in this.settings.properties) {
                this.notifyPath("settings." + prop, this.settings[prop]);
            }
        },
        _openStartView: function(changingPwd) {
            this.$.startView.mode = (changingPwd === true) ? "change-password" : "get-started";
            this.$.header.showing = false;
            this._openView(
                this.$.startView,
                {animation: "contract", easing: "cubic-bezier(0.8, 0, 0.2, 1.2)", delay: 300},
                {animation: "popout"}
            );
        },
        // Handler for when a record is selected from the list view. Updates the `_selected` property through
        // the selector element
        _recordSelected: function(e) {
            this.$.selector.select(e.detail.record);
        },
        // Notifies bindings of changes to the header title. It is necessary to do this after a record name was
        // changed from the record view
        _notifyHeaderTitle: function() {
            this.notifyPath("_currentView.headerTitle", this._currentView && this._currentView.headerTitle);
        },
        // Notifies bindings of changes to the header title. It is necessary to do this if the header icons change
        // based on an action in the current view without the view itself being changed
        _notifyHeaderIcons: function() {
            this.notifyPath("_currentView.leftHeaderIcon", this._currentView && this._currentView.leftHeaderIcon);
            this.notifyPath("_currentView.rightHeaderIcon", this._currentView && this._currentView.rightHeaderIcon);
        },
        _openGenerator: function(e) {
            // Set field object to generate a value for, if any
            this.$.generatorView.field = e && e.detail.field;
            // If a value is to be generated for an existing field (meaning the generate view was invoked from
            // the record view), show a slightly different animation
            if (this.$.generatorView.field) {
                this._openView(this.$.generatorView, {animation: "slideInFromBottom"}, {animation: "slideOutToBottom"});
            } else {
                this._openView(this.$.generatorView);
            }
        },
        // Back / cancel handler for generator view. Behaves differently based on where the generator view
        // was openened from
        _generatorBack: function(e) {
            if (e.detail.field) {
                // The value was to be generated for an existing field, meaning the generator was invoked from
                // the record view but then canceled. Go back to the record view and call the `generateConfirm`
                // method, but without the value argument, indicating that the generate action was canceled
                this._openView(this.$.recordView, {animation: "slideInFromBottom"}, {animation: "slideOutToBottom"});
                this.async(function() {
                    this.$.recordView.generateConfirm(e.detail.field, e.detail.value);
                }, 100);
            } else {
                // The generator view had been opened from the list view, so simply go back there
                this._openView(this.$.listView);
            }
        },
        // Opens a dialog with a dynamic form based on the provided arguments
        _openForm: function(components, title, submitCallback, cancelCallback, allowDismiss) {
            // We have two dialogs; if the first one is currently showing, we use the second one.
            // That way we get a nice and smooth transition between dialogs in case we close one and
            // instantly open another
            var dialog = this.$.formDialog1.isShowing ? this.$.formDialog2 : this.$.formDialog1;
            dialog.allowDismiss = allowDismiss !== false;
            // Get form and title element associated with the selected form
            var form = Polymer.dom(dialog).querySelector("padlock-dynamic-form");
            var titleEl = Polymer.dom(dialog).querySelector(".title");
            // Close both forms
            this.$.formDialog1.open = this.$.formDialog2.open = false;
            // Update title
            titleEl.innerHTML = title || "";
            // Update components property, which causes the dynamic form elements to be rendered
            form.components = components;
            // Update callbacks
            form.submitCallback = submitCallback;
            form.cancelCallback = cancelCallback;
            // This is a little tweak to improve alignment of the keyboard on iOS
            platform.keyboardDisableScroll(false);
            // Open the dialog asynchrously and focus first first input with the `auto-focus` attribute (if any)
            this.async(function() {
                dialog.open = true;
                var input = form.querySelector("input[auto-focus]");
                // Instantly focusing an input look kind of jumpy if a virtual keyboard is shown so only
                // do the focus if not on a smartphone/tablet
                if (input && !platform.isIOS()) {
                    input.focus();
                }
            }, 50);
        },
        // Closes the dialog from which the event was sent
        _closeCurrentDialog: function(e) {
            e.currentTarget.open = false;
            // If no dialogs remain open, disable keyboard scroll again
            if (!Polymer.dom(this.root).querySelectorAll("padlock-dialog.open").length) {
                platform.keyboardDisableScroll(true);
            }
        },
        // Handler for when a form dialog gets dismissed (by clicking outside of it). Does some cleanup work
        // and calls the form cancel callback
        _formDismiss: function(e) {
            // Fetch form element of current target
            var form = Polymer.dom(e.target).querySelector("padlock-dynamic-form");
            // Blur all input elements
            form.blurInputElements();
            // Call cancel callback if there is one
            if (typeof form.cancelCallback == "function") {
                form.cancelCallback();
            }
            // If no dialogs remain open, disable keyboard scroll again
            if (!Polymer.dom(this.root).querySelectorAll("padlock-dialog.open").length) {
                platform.keyboardDisableScroll(true);
            }
        },
        // Simple function for identifying an empty string. Mainly used in declaratative data bindings
        _isEmpty: function(str) {
            return !str;
        },
        // Handler for children elements requesting to open a form
        _openFormHandler: function(e) {
            this._openForm(e.detail.components, e.detail.title, e.detail.submit, e.detail.cancel,
                e.detail.allowDismiss);
        },
        // Handler for children elements requesting to open an alert dialog
        _alertHandler: function(e) {
            this._alert(e.detail.message);
        },
        // Display a dialog listing all the available keyboard shortcuts
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
        // Simple function for determining if the current environment is touch-enabled. Mostly used in
        // declaratative data bindings
        _isTouch: function() {
            return platform.isTouch();
        },
        // Shows a toaster notification
        _notify: function(e) {
            this.$.notification.show(e.detail.message, e.detail.type, e.detail.duration);
        },
        // Shows a dialog reminding the user about backing up data and provides some options for doing so
        _showBackupReminder: function() {
            this._openForm(
                [
                    {element: "button", label: "Export Data", close: true, tap: this._openExportView.bind(this)},
                    {element: "button", label: "Sync Data", close: true, tap: this._synchronize.bind(this)},
                    {element: "button", label: "Dismiss", close: true}
                ],
                "Have you backed up your data yet? Remember that by default your data is only stored " +
                "locally and may be lost if you uninstall Padlock, lose your device or accidentally " +
                "reset your data. You can backup your data by exporting it " +
                "or synching it with Padlock Cloud."
            );
            this.set("settings.showed_backup_reminder", new Date().getTime());
        },
        _errorHandler: function(e) {
            this._handleError(e.detail);
        },
        _handleError: function(e) {
            switch(e) {
                case padlock.ERR_CLOUD_UNAUTHORIZED:
                    this.set("settings.sync_connected", false);
                    this.set("settings.sync_key", "");
                    this.set("settings.sync_email", "");
                    this._openForm(
                        [{element: "button", label: "Open Padlock Cloud Settings",
                            tap: this._openCloudView.bind(this)}],
                        "It seems you have been disconnected from Padlock Cloud. Please reconnect " +
                        "via Settings > Padlock Cloud!"
                    );
                    break;
                case padlock.ERR_STORE_DECRYPT:
                    this._alert("The password you entered was wrong! Please try again!");
                    break;
                case padlock.ERR_CLOUD_FAILED_CONNECTION:
                    this._alert("Failed to connect to Padlock Cloud. Please check your " +
                        "internet connection and try again!");
                    break;
                case padlock.ERR_CLOUD_VERSION_DEPRECATED:
                    this._openForm(
                        [{element: "button", label: "Update Now", tap: this._openAppStore.bind(this), submit: true}],
                        "A newer version of Padlock is available now! You can download it using the button below." +
                        "Please note that you won't be able to use Padlock Cloud until you install the latest version!"
                    );
                    break;
                default:
                    this._alert("There was an error while trying to connect to Padlock Cloud. " +
                        "Please try again later!");
            }
        },
        _openAppStore: function() {
            window.open(platform.getAppStoreLink(), "_system");
        },
        _alertReadonly: function() {
            this._openForm(
                [
                    {element: "button", label: "Renew Subscription", submit: true,
                        tap: this._buySubscription.bind(this)},
                    {element: "button", label: "Go To Padlock Cloud Settings", submit: true,
                        tap: this._openCloudView.bind(this)},
                    {element: "button", label: "Dismiss", cancel: true}
                ],
                "It seems your Padlock Cloud subscription has expired which means that you can " +
                "download your data from the cloud but you won't be able to update it or synchronize with " +
                "any other devices. Renew your subscription now to unlock the full potential of Padlock Cloud!"
            );
        },
        _buySubscription: function() {
            var info = pay.getProductInfo();
            this._openForm(
                [
                    {element: "button", label: "Buy Subscription (" + info.price + " / month)", submit: true},
                    {element: "button", label: "No Thanks", cancel: true}
                ],
                info.description,
                function() {
                    pay.orderSubscription(this.settings.sync_email);
                }.bind(this)
            );
        },
        _selectMarkedRecord: function() {
            this._currentView.selectMarked && this._currentView.selectMarked();
        }
    });

})(Polymer, padlock.platform, padlock.pay);
