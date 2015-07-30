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
            this.headerOptions.show = true;
            this.headerOptions.leftIconShape = "left";
            this.headerOptions.rightIconShape = "";
            this.headerTitle = "Settings";
        },
        leftHeaderButton: function() {
            this.fire("back");
        },
        //* Opens the change password dialog and resets the corresponding input elements
        _changePassword: function() {
            this.$.changePasswordErrorDialog.open = false;
            this.$.currPwdInput.value = "";
            this.$.newPwdInput.value = "";
            this.$.confirmNewPwdInput.value = "";
            this.$.changePasswordDialog.open = true;
        },
        _confirmChangePassword: function() {
            this.$.changePasswordDialog.open = false;
            // TODO: Add a better check for the current password
            if (this.$.currPwdInput.value != this.collection.defaultPassword) {
                this.$.changePasswordErrorMsg.innerHTML = "You entered the wrong current password.";
                this.$.changePasswordErrorDialog.open = true;
            } else if (this.$.newPwdInput.value != this.$.confirmNewPwdInput.value) {
                this.$.changePasswordErrorMsg.innerHTML =
                    "The new password you entered did not match the one in the confirmation input.";
                this.$.changePasswordErrorDialog.open = true;
            } else {
                this.collection.setPassword(this.$.newPwdInput.value);
                this.$.changePasswordSuccessDialog.open = true;
            }
        },
        _closeChangePasswordErrorDialog: function() {
            this.$.changePasswordErrorDialog.open = false;
        },
        _closeChangePasswordSuccessDialog: function() {
            this.$.changePasswordSuccessDialog.open = false;
        },
        //* Opens the dialog for connecting to the Padlock Cloud
        _cloudConnect: function() {
            this.$.emailInput.value = this.settings.sync_email || "";
            this.$.deviceNameInput.value = this.settings.sync_device || "";
            this.$.connectDialog.open = true;
        },
        _confirmConnect: function() {
            this.$.connectDialog.open = false;
            this.set("settings.sync_email", this.$.emailInput.value);
            this.set("settings.sync_device", this.$.deviceNameInput.value);
            this.requestApiKey();
        },
        _cloudDisconnect: function() {
            this.$.disconnectDialog.open = true;
        },
        _confirmDisconnect: function() {
            this.$.disconnectDialog.open = false;
            this.set("settings.sync_connected", false);
            this.set("settings.sync_key", "");
        },
        _cancelDisconnect: function() {
            this.$.disconnectDialog.close();
        },
        //* Requests an api key from the cloud api with the entered email and device name
        _requestApiKey: function() {
            var req = new XMLHttpRequest(),
                url = this.settings.sync_host + "auth/",
                email = this.$.emailInput.value,
                deviceName = this.$.deviceNameInput.value;

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
                        this.alert("Almost done! An email was sent to " + email + ". Please follow the " +
                            "instructions to complete the connection process!");
                    } else {
                        this.alert("Something went wrong. Please make sure your internet " +
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
            this.$.alertText.innerHTML = message;
            this.$.alertDialog.open = true;
        },
        _dismissAlert: function() {
            this.$.alertDialog.open = false;
        },
        //* Tap handler for the auto sync row. Toggles the auto sync toggle element
        _toggleAutoSync: function() {
            this.$.autoSyncToggle.toggle();
        },
        _import: function() {
            this.fire("import");
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
            this.$.resetConfirmPwd.value = "";
            this.$.resetDataDialog.open = true;
        },
        _confirmResetData: function() {
            this.$.resetDataDialog.open = false;

            if (this.$.resetConfirmPwd.value == this.collection.defaultPassword) {
                this.collection.clear();
                this.collection.destroy();
                this.fire("reset");
            } else {
                this.alert("The password you entered was incorrect.");
            }
        },
        _cancelResetData: function() {
            this.$.resetDataDialog.open = false;
        },
        _resetRemoteData: function() {
            this.$.resetRemoteDataDialog.open = true;
        },
        _confirmResetRemoteData: function() {
            this.$.resetRemoteDataDialog.open = false;

            var req = new XMLHttpRequest(),
                email = this.settings.sync_email,
                url = this.settings.sync_host + email;

            this.$.progress.show();

            req.onreadystatechange = function() {
                if (req.readyState === 4) {
                    // Hide progress indicator
                    this.$.progress.hide();
                    if (req.status === 202) {
                        this.alert("Almost done! An email was sent to " + email + ". Please follow the " +
                            "instructions to confirm the reset!");
                    } else {
                        this.alert("Something went wrong. Please make sure your internet " +
                            "connection is working and try again!");
                    }
                }
            }.bind(this);

            req.open("DELETE", url, true);
            req.send();
        },
        _cancelResetRemoteData: function() {
            this.$.resetRemoteDataDialog.open = false;
        }
    });

})(Polymer, padlock.platform, padlock.ViewBehavior);
