/* jshint browser: true */
/* global Polymer, padlock */

(function(Polymer, platform, ViewBehavior) {
    "use strict";

    Polymer({
        is: "padlock-settings-view",
        behaviors: [ViewBehavior],
        properties: {
            collection: Object,
            settings: Object
        },
        ready: function() {
            this.leftHeaderIcon = "left";
            this.rightHeaderIcon = "";
            this.headerTitle = "Settings";
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        //* Opens the change password dialog and resets the corresponding input elements
        _changePassword: function() {
            this.fire("open-form", {
                components: [
                    {element: "input", type: "password", placeholder: "Enter Current Password",
                        name: "password", autofocus: true},
                    {element: "button", label: "Enter", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Change Master Password",
                submit: function(data) {
                    // TODO: Add a better check for the current password
                    if (data.password != this.collection.defaultPassword) {
                        this.fire("notify", {message: "Wrong password!", type: "error", duration: 2000});
                    } else {
                        this.fire("change-password");
                    }
                }.bind(this)
            });
        },
        //* Opens the dialog for connecting to the Padlock Cloud
        _cloudConnect: function() {
            this.fire("open-form", {
                components: [
                    {element: "input", type: "email", placeholder: "Email Address", name: "email", autofocus: true},
                    {element: "input", placeholder: "Device Name", name: "device"},
                    {element: "button", label: "Connect", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Connect to Padlock Cloud",
                submit: this._requestApiKey.bind(this)
            });
        },
        _cloudDisconnect: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Disconnect", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Are you sure you want to disconnect from Padlock Cloud?",
                submit: function() {
                    this.set("settings.sync_connected", false);
                    this.set("settings.sync_key", "");
                }.bind(this)
            });
        },
        //* Requests an api key from the cloud api with the entered email and device name
        _requestApiKey: function(data) {
            var req = new XMLHttpRequest();
            var url = this.settings.sync_host + "auth/";
            var email = data.email;
            var deviceName = data.device;

            this.set("settings.sync_email", email);
            this.set("settings.sync_device", deviceName);

            // Show progress indicator
            this.$.progress.show();

            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    // Hide progress indicator
                    this.$.progress.hide();
                    if (req.status === 200) {
                        var apiKey = JSON.parse(req.responseText);
                        // We're getting back the api key directly, but it will valid only
                        // after the user has visited the activation link in the email he was sent
                        this.set("settings.sync_key", apiKey.key);
                        this.set("settings.sync_connected", true);
                        this._alert("Almost done! An email was sent to " + email + ". Please follow the " +
                            "instructions to complete the connection process!");
                    } else {
                        this._alert("Something went wrong. Please make sure your internet " +
                            "connection is working and try again!");
                    }
                }
            }.bind(this);

            req.open("POST", url, true);
            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            req.setRequestHeader("Accept", "application/json");
            req.send("email=" + email + "&device_name=" + deviceName);
        },
        //* Shows an alert dialog with a given _message_
        _alert: function(message) {
            this.fire("alert", {message: message});
        },
        _import: function() {
            this.fire("import");
        },
        _export: function() {
            this.fire("export");
        },
        _openWebsite: function() {
            window.open("http://padlock.io", "_system");
        },
        _sendMail: function() {
            var url = "mailto:support@padlock.io";

            // window.location = "mailto:..." won't work in packaged chrome apps so we have to use window.open
            if (platform.isChromeApp()) {
                window.open(url);
            } else {
                window.location = url;
            }
        },
        _openGithub: function() {
            window.open("http://github.com/maklesoft", "_system");
        },
        _resetData: function() {
            this.fire("open-form", {
                components: [
                    {element: "input", type: "password", placeholder: "Enter Master Password",
                        name: "password", autofocus: true},
                    {element: "button", label: "Reset", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Are you sure you want to reset all your data? This action can not be undone! " +
                    "Please enter your master password to confirm.",
                submit: function(data) {
                    if (data.password == this.collection.defaultPassword) {
                        this.collection.clear();
                        this.collection.destroy();
                        this.fire("reset");
                    } else {
                        this.fire("notify", {message: "Wrong password!", type: "error", duration: 2000});
                    }
                }.bind(this)
            });
        },
        _resetRemoteData: function() {
            this.fire("open-form", {
                components: [
                    {element: "button", label: "Reset", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Are you sure you want to reset all your data on Padlock Cloud?",
                submit: this._requestResetRemoteData.bind(this)
            });
        },
        _requestResetRemoteData: function() {
            var req = new XMLHttpRequest(),
                email = this.settings.sync_email,
                url = this.settings.sync_host + email;

            this.$.progress.show();

            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    // Hide progress indicator
                    this.$.progress.hide();
                    if (req.status === 202) {
                        this._alert("Almost done! An email was sent to " + email + ". Please follow the " +
                            "instructions to confirm the reset!");
                    } else {
                        this._alert("Something went wrong. Please make sure your internet " +
                            "connection is working and try again!");
                    }
                }
            }.bind(this);

            req.open("DELETE", url, true);
            req.send();
        }
    });

})(Polymer, padlock.platform, padlock.ViewBehavior);
