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
        _import: function() {
            this.fire("import");
        },
        _export: function() {
            this.fire("export");
        },
        _openWebsite: function() {
            window.open("https://padlock.io", "_system");
        },
        _sendMail: function() {
            var url = "mailto:support@padlock.io";
            window.open(url, "_system");
        },
        _openGithub: function() {
            window.open("https://github.com/maklesoft", "_system");
        },
        _openHomepage: function() {
            // window.open("http://maklesoft.com/", "_system");
            this._openGithub();
        },
        _resetData: function() {
            this.fire("open-form", {
                components: [
                    {element: "input", type: "password", placeholder: "Enter Master Password",
                        name: "password", autofocus: true},
                    {element: "button", label: "Reset", submit: true},
                    {element: "button", label: "Cancel", cancel: true}
                ],
                title: "Are you sure you want to reset Padlock and delete all your data from this device? " +
                    "This action can not be undone! Please enter your master password to confirm.",
                submit: function(data) {
                    if (data.password == this.collection.defaultPassword) {
                        this.fire("reset");
                    } else {
                        this.fire("notify", {message: "Wrong password!", type: "error", duration: 2000});
                    }
                }.bind(this)
            });
        },
        _openCloudView: function() {
            this.fire("open-cloud-view");
        },
        _version: function() {
            return padlock.version;
        }
    });

})(Polymer, padlock.platform, padlock.ViewBehavior);
