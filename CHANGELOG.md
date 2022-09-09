# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 4.1.0

### New stuff & Improvements

-   You will now receive an email notification when there's been 5 failed login
    attempts
-   You will also receive an email notification when there's been a successful
    login from a new or untrusted device; you can disable these from your
    security settings
-   Your items will now start keeping historical changes and you can restore
    them
-   You can now set an expiration time for your items, and have them show in
    your Security Report once that expiration date passes
-   You can now import Bitwarden .json files directly
-   You can now import recent LastPass .csv files directly (with one-time
    password support)
-   If you belong to an org that has a premium plan, you can now benefit from
    those features in your private vault

### Bug fixes

-   Fixed the extraneous scrollbar on web extension popup
-   Fixed the fact you could end up in edit mode while navigating back/forward
-   Fixed being able to press the biometric toggle even when the device wasn't
    supported

## 4.0.2

### New stuff & Improvements

-   Added new Italian translation (grazie @coluzziandrea)
-   Updated multiple dependencies for security and reliability improvements
-   Many minor UI and UX improvements

### Bug fixes

-   Fixed various usability issues with full-screen note editing on iOS
-   Fixed the problem with changing the master password

## 4.0.0

Initial release of Padloc 4 (changes before 4.0.0 are not included in this
change log), though
[some can be seen in this commit](https://github.com/padloc/padloc/blob/12b027b37ccf123b15a066e4715354f4cf080384/CHANGELOG.md).
