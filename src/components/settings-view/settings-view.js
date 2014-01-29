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
    }
});