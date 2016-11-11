/* global padlock */
(function() {
    "use strict";

    function fetchVersion() {
        padlock.platform.getAppVersion(function(version) {
            padlock.version = version;
        });
    }

    fetchVersion();
    // Try to get app version again after deviceready event since the getAppVersion
    // plugin is not ready before
    document.addEventListener("deviceready", fetchVersion);
})();
