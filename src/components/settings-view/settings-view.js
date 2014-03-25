Polymer("padlock-settings-view", {
    headerOptions: {
        show: true,
        leftIconShape: "arrow-left",
        rightIconShape: ""
    },
    titleText: "Settings",
    leftHeaderButton: function() {
        this.fire("back");
    },
    //* Opens the change password dialog and resets the corresponding input elements
    changePassword: function() {
        this.$.changePasswordErrorDialog.open = false;
        this.$.currPwdInput.value = "";
        this.$.newPwdInput.value = "";
        this.$.confirmNewPwdInput.value = "";
        this.$.changePasswordDialog.open = true;
    },
    confirmChangePassword: function() {
        this.$.changePasswordDialog.open = false;
        if (this.$.currPwdInput.value != this.collection.store.password) {
            this.$.changePasswordErrorMsg.innerHTML = "You entered the wrong current password.";
            this.$.changePasswordErrorDialog.open = true;
        } else if (this.$.newPwdInput.value != this.$.confirmNewPwdInput.value) {
            this.$.changePasswordErrorMsg.innerHTML = "The new password you entered did not match the one in the confirmation input.";
            this.$.changePasswordErrorDialog.open = true;
        } else {
            this.collection.setPassword(this.$.newPwdInput.value);
            this.$.changePasswordSuccessDialog.open = true;
        }
    },
    closeChangePasswordErrorDialog: function() {
        this.$.changePasswordErrorDialog.open = false;
    },
    closeChangePasswordSuccessDialog: function() {
        this.$.changePasswordSuccessDialog.open = false;
    },
    cloudConnect: function() {
        this.$.emailInput.value = this.settings.sync_email || "";
        this.$.deviceNameInput.value = this.settings.sync_device || "";
        this.$.connectDialog.open = true;
    },
    confirmConnect: function() {
        this.$.connectDialog.open = false;
        this.settings.sync_email = this.$.emailInput.value;
        this.settings.sync_device = this.$.deviceNameInput.value;
        this.settings.save();
        this.requestApiKey();
    },
    cloudDisconnect: function() {
        this.$.disconnectDialog.open = true;
    },
    confirmDisconnect: function() {
        this.$.disconnectDialog.open = false;
        this.settings.sync_connected = false;
        this.settings.sync_key = "";
        this.settings.save();
    },
    cancelDisconnect: function() {
        this.$.disconnectDialog.close();
    },
    requestApiKey: function() {
        var req = new XMLHttpRequest(),
            url = this.settings.sync_host + "auth/",
            email = this.$.emailInput.value,
            deviceName = this.$.deviceNameInput.value;

        req.onreadystatechange = function() {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    this.settings.sync_key = req.response.key;
                    this.settings.sync_connected = true;
                    this.settings.save();
                    this.alert("An email was sent to " + email + ". Please follow the " +
                        "activation link in the message to complete the connection process!");
                } else {
                    this.alert("Something went wrong. Please make sure your internet " +
                        "connection is working and try again!");
                }
            }
        }.bind(this);

        req.responseType = "json";
        req.open("POST", url, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.setRequestHeader("Accept", "application/json");
        req.send("email=" + email + "&device_name=" + deviceName);
    },
    alert: function(message) {
        this.$.alertText.innerHTML = message;
        this.$.alertDialog.open = true;
    },
    dismissAlert: function() {
        this.$.alertDialog.open = false;
    },
    toggleAutoSync: function(event, detail, sender) {
        if (event.impl.target != this.$.autoSyncToggle.impl) {
            this.$.autoSyncToggle.toggle();
        }
    },
    save: function() {
        this.settings.save();
    }
});