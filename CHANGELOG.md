# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 3.1.0

### New Stuff & Improvements

-   Improved flow for creating a vault item
-   If a vault filter is active, preselect that vault during vault item creation
-   Prefill field names with sensible default when adding new field
-   Automated account migration if legacy account is detected during login/signup
-   "Login" vault item template is now called "Website / App"
-   Added new vault item template "Computer"
-   [DESKTOP] Ctrl/cmd + Shift + F to search all items (resetting any active filters)
-   [ANDROID] Allow reordering fields via drag and drop on Android
-   [SERVER] Option to enable secure connection when sending emails, enabled via `PL_EMAIL_SECURE` environment variable

### Bug Fixes

-   Sometimes the app would show a blank screen directly after unlocking.
-   Changes made to a vault item directly after creating it would sometimes be discarded.

## 3.0.0

Initial release of Padloc 3 (changes before 3.0.0 are not included in this change log).
