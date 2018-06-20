cordova-android-support-gradle-release
======================================

This Cordova/Phonegap plugin for Android aligns various versions of the Android Support libraries specified by other plugins to a specific version.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Purpose](#purpose)
- [Installation](#installation)
- [Library versions](#library-versions)
  - [Default version](#default-version)
  - [Other versions](#other-versions)
- [Example cases](#example-cases)
  - [Example 1](#example-1)
  - [Example 2](#example-2)
- [Credits](#credits)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
 
# Purpose

**TL;DR**: To prevent build failures caused by including different versions of the support libraries. 

Some Cordova plugins include [Android Support Libraries](https://developer.android.com/topic/libraries/support-library/index.html) to faciliate them.
Most commonly, these are now included into the Cordova project by specifying them as Gradle dependencies (see the [Cordova plugin spec documentation](https://cordova.apache.org/docs/en/latest/plugin_ref/spec.html#framework)).

Example plugins:
- [cordova-diagnostic-plugin](https://github.com/dpa99c/cordova-diagnostic-plugin)
- [Telerik ImagePicker plugin](https://github.com/Telerik-Verified-Plugins/ImagePicker)
- [cordova-plugin-local-notifications](https://github.com/katzer/cordova-plugin-local-notifications/)
- [cordova-plugin-facebook4](https://github.com/jeduan/cordova-plugin-facebook4)

The problem arises when these plugins specify different versions of the support libraries. This can cause build failures to occur, which are not easy to resolve without changes by the plugin authors to align the specified versions. See these issues:

- [phonegap-plugin-barcodescanner#480](https://github.com/phonegap/phonegap-plugin-barcodescanner/issues/480)
- [cordova-plugin-facebook4#507](https://github.com/jeduan/cordova-plugin-facebook4/issues/507)
- [cordova-plugin-local-notifications#1322](https://github.com/katzer/cordova-plugin-local-notifications/issues/1322)
- [cordova-diagnostic-plugin#211](https://github.com/dpa99c/cordova-diagnostic-plugin/issues/211)

To resolve these version collisions, this plugin injects a Gradle configuration file into the native Android platform project, which overrides any versions specified by other plugins, and forces them to the version specified in its Gradle file.

If you're encountering similar problems with the Play Services and/or Firebase libraries, checkout the sister plugins:
- [cordova-android-play-services-gradle-release](https://github.com/dpa99c/cordova-android-play-services-gradle-release)
- [cordova-android-firebase-gradle-release](https://github.com/dpa99c/cordova-android-firebase-gradle-release)



# Installation

    $ cordova plugin add cordova-android-support-gradle-release
    $ cordova plugin add cordova-android-support-gradle-release  --variable ANDROID_SUPPORT_VERSION={required version}
    
The plugin needs to be installed with the [`cordova-fetch`](https://cordova.apache.org/news/2016/05/24/tools-release.html) mechanism in order to satisfy its [package dependencies](https://github.com/dpa99c/cordova-android-support-gradle-release/blob/master/package.json#L8) by installing it via npm.

Therefore if you're installing with `cordova@6`, you'll need to explicitly specify the `--fetch` option:

    $ cordova plugin add cordova-android-support-gradle-release --fetch   

# Library versions

## Default version
By default, this plugin will use the major version of the most recent release of the support libraries - [see here](https://developer.android.com/topic/libraries/support-library/revisions.html) for a list recent versions. "Most recent release" means the highest major version that will not result in an Alpha or Beta version being included.

    $ cordova plugin add cordova-android-support-gradle-release

For example, if the most recent versions are:
- `26.0.0 Beta 2`
- `25.4.0`

Then this plugin will default to `25.+` because `26` is still in Beta.

## Other versions

In some cases, you may want to specify a different version of the support libraries. For example, [Telerik ImagePicker plugin v2.1.7](https://github.com/Telerik-Verified-Plugins/ImagePicker/tree/2.1.7) specifies `v23` because it contains code that is incompatible with `v24+`. 

In this case, including the default version of this plugin will still result in a build error. So this plugin enables you to specify other versions of the support library using the `ANDROID_SUPPORT_VERSION` plugin variable.
 
In the above case, you'd want to install v23 of the support library. To so, you'd specify the version via the variable:

    cordova plugin add cordova-android-support-gradle-release --variable ANDROID_SUPPORT_VERSION=23.+
    
# Example cases

## Example 1

Uses v25 of the support libraries to fix the build issue.

1. `cordova create test1 && cd test1/`
2. `cordova platform add android@latest`
3. `cordova plugin add cordova-plugin-facebook4@1.9.1 --save --variable APP_ID="123456789" --variable APP_NAME="myApplication"`
4. `cordova compile`

Observe the build succeeds and in the console output is `v25.3.1` of Android Support Library:

    :prepareComAndroidSupportSupportV42531Library

5. `cordova plugin add de.appplant.cordova.plugin.local-notification@0.8.5`
6. `cordova compile`

Observe the build failed and in the console output is higher than `v25.3.1` (e.g `v26.0.0-alpha1`) of Android Support Library:

    :prepareComAndroidSupportSupportV42600Alpha1Library

7. `cordova plugin add cordova-android-support-gradle-release --variable ANDROID_SUPPORT_VERSION=25.+`
8. `cordova prepare && cordova compile`    

Observe the build succeeds and in the console output is `v25` of Android Support Library.

## Example 2

Uses v23 of the support libraries to fix the build issue, because v2.1.7 of the ImagePicker only works with v23.

1. `cordova create test2 && cd test2/`
2. `cordova platform add android@latest`
3. `cordova plugin add https://github.com/Telerik-Verified-Plugins/ImagePicker.git#2.1.7`
4. `cordova compile`

Observe the build succeeds and in the console output is `v23.4.0` of Android Support Library:

    :prepareComAndroidSupportSupportV42340Library
    
5. `cordova plugin add cordova.plugins.diagnostic@3.6.5`

Observe the build failed and in the console output is higher than `v23.4.0` (e.g `v26.0.0-alpha1`) of Android Support Library:

    :prepareComAndroidSupportSupportV42600Alpha1Library
    
7. `cordova plugin add cordova-android-support-gradle-release`
8. `cordova compile`

Observe the build still failed and in the console output is still higher than `v23.4.0` (e.g `v25.3.1`) of Android Support Library:

    :prepareComAndroidSupportSupportV42531Library
    
9. `cordova plugin rm cordova-android-support-gradle-release`
10. `cordova plugin add cordova-android-support-gradle-release --variable ANDROID_SUPPORT_VERSION=23.+`
11. `cordova prepare && cordova compile`

Observe the build succeeds and in the console output is v23 of Android Support Library.


# Credits

Thanks to [**Chris Scott, Transistor Software**](https://github.com/christocracy) for his idea of extending the initial implementation to support dynamic specification of the library version via a plugin variable in [cordova-google-api-version](https://github.com/transistorsoft/cordova-google-api-version)

License
================

The MIT License

Copyright (c) 2017 Dave Alden / Working Edge Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.