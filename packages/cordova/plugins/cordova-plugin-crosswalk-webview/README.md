# cordova-plugin-crosswalk-webview

Makes your Cordova application use the [Crosswalk WebView](https://crosswalk-project.org/)
instead of the System WebView. Requires cordova-android 4.0 or greater.

### Benefits

* WebView doesn't change depending on Android version
* Capabilities: such as WebRTC, WebAudio, Web Components
* Performance improvements (compared to older system webviews)


### Drawbacks

* Increased memory footprint
  * An overhead of ~30MB (as reported by the RSS column of ps)
* Increased APK size (about 17MB)
* Increased size on disk when installed (about 50MB)
* Crosswalk WebView stores data (IndexedDB, LocalStorage, etc) separately from System WebView
  * You'll need to manually migrate local data when switching between the two (note: this is fixed in Crosswalk 15)

### Install

The following directions are for cordova-cli (most people).  Alternatively you can use the [Android platform scripts workflow](PlatformScriptsWorkflow.md).

* Open an existing cordova project, with cordova-android 4.0.0+, and using the latest CLI. Crosswalk variables can be configured as an option when installing the plugin
* Add this plugin

```
$ cordova plugin add cordova-plugin-crosswalk-webview
```

* Build
```
$ cordova build android
```
The build script will automatically fetch the Crosswalk WebView libraries from Crosswalk project download site (https://download.01.org/crosswalk/releases/crosswalk/android/maven2/) and build for both X86 and ARM architectures.

For example, building android with Crosswalk generates:

```
/path/to/hello/platforms/android/build/outputs/apk/hello-x86-debug.apk
/path/to/hello/platforms/android/build/outputs/apk/hello-armv7-debug.apk
```

Note that you might have to run `cordova clean` before building, if you previously built the app without cordova-plugin-crosswalk-webview. Also, manually uninstall the app from the device/emulator before attempting to install the crosswalk-enabled version.

Also note that it is also possible to publish a multi-APK application on the Play Store that uses Crosswalk for Pre-L devices, and the (updatable) system webview for L+:

To build Crosswalk-enabled apks, add this plugin and run:

    $ cordova build --release

To build System-webview apk, remove this plugin and run:

    $ cordova build --release -- --minSdkVersion=21

### Configure

You can try out a different Crosswalk version by specifying certain variables while installing the plugin, or by changing the value of `xwalkVersion` in your `config.xml` after installing the plugin. Some examples:

    <!-- These are all equivalent -->
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="org.xwalk:xwalk_core_library:14+"
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="xwalk_core_library:14+"
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="14+"
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="14"
    <preference name="xwalkVersion" value="org.xwalk:xwalk_core_library:14+" />
    <preference name="xwalkVersion" value="xwalk_core_library:14+" />
    <preference name="xwalkVersion" value="14+" />
    <preference name="xwalkVersion" value="14" />

You can also use a Crosswalk beta version. Some examples:

    <!-- These are all equivalent -->
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="org.xwalk:xwalk_core_library_beta:14+"
    <preference name="xwalkVersion" value="org.xwalk:xwalk_core_library_beta:14+" />

You can set [command-line flags](http://peter.sh/experiments/chromium-command-line-switches/) as well:

    <!-- This is the default -->
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_COMMANDLINE="--disable-pull-to-refresh-effect"
    <preference name="xwalkCommandLine" value="--disable-pull-to-refresh-effect" />

You can use the Crosswalk [shared mode](https://crosswalk-project.org/documentation/shared_mode.html) which allows multiple Crosswalk applications to share one Crosswalk runtime downloaded from the Play Store.

    <!-- These are all equivalent -->
    cordova plugin add cordova-plugin-crosswalk-webview  --variable XWALK_MODE="shared"
    <preference name="xwalkMode" value="shared" />

You can also use a Crosswalk beta version on shared mode, e.g.:

    <!-- Using a Crosswalk shared mode beta version -->
    cordova plugin add cordova-plugin-crosswalk-webview --variable XWALK_VERSION="org.xwalk:xwalk_shared_library_beta:14+"

You can use the Crosswalk [lite mode](https://crosswalk-project.org/documentation/crosswalk_lite.html) which is the Crosswalk runtime designed to be as small as possible by removing less common libraries and features and compressing the APK.

    <!-- These are all equivalent -->
    cordova plugin add cordova-plugin-crosswalk-webview  --variable XWALK_MODE="lite"
    <preference name="xwalkMode" value="lite" />

You can set background color with the preference of BackgroundColor.

    <!-- Set red background color -->
    <preference name="BackgroundColor" value="0xFFFF0000" />

You can also set user agent with the preference of xwalkUserAgent.

    <preference name="xwalkUserAgent" value="customer UA" />

### Release Notes

#### 2.4.0
* Keep compatibility with cordova-android 7.0 project structure

#### 2.3.0 (January 21, 2017)
* Uses the latest Crosswalk 23 stable version by default

#### 2.2.0 (November 4, 2016)
* Uses the latest Crosswalk 22 stable version by default
* Keep compatible for Cordova-android 6.0 with evaluating Javascript bridge
* This version requires cordova-android 6.0.0 or newer

#### 2.1.0 (September 9, 2016)
* Uses the latest Crosswalk 21 stable version by default

#### 2.0.0 (August 17, 2016)
* Uses the latest Crosswalk 20 stable version by default
* Discontinue support for Android 4.0 (ICS) in Crosswalk starting with version 20

#### 1.8.0 (June 30, 2016)
* Uses the latest Crosswalk 19 stable version by default

#### 1.7.0 (May 4, 2016)
* Uses the latest Crosswalk 18 stable version by default
* Support to use [Crosswalk Lite](https://crosswalk-project.org/documentation/crosswalk_lite.html), It's possible to specify lite value with the variable of XWALK_MODE at install plugin time.
* [Cordova screenshot plugin](https://github.com/gitawego/cordova-screenshot.git) can capture the visible content of web page with Crosswalk library.
* Doesn't work with Crosswalk 17 and earlier

#### 1.6.0 (March 11, 2016)
* Uses the latest Crosswalk 17 stable version by default
* Support to [package apps for 64-bit devices](https://crosswalk-project.org/documentation/android/android_64bit.html), it's possible to specify 64-bit targets using the `--xwalk64bit` option in the build command:

        cordova build android --xwalk64bit

#### 1.5.0 (January 18, 2016)
* Uses the latest Crosswalk 16 stable version by default
* The message of xwalk's ready can be listened

#### 1.4.0 (November 5, 2015)
* Uses the latest Crosswalk 15 stable version by default
* Support User Agent and Background Color configuration preferences
* Compatible with the newest Cordova version 5.3.4

#### 1.3.0 (August 28, 2015)
* Crosswalk variables can be configured as an option via CLI
* Support for [Crosswalk's shared mode](https://crosswalk-project.org/documentation/shared_mode.html) via the XWALK_MODE install variable or xwalkMode preference
* Uses the latest Crosswalk 14 stable version by default
* The ANIMATABLE_XWALK_VIEW preference is false by default
* Doesn't work with Crosswalk 14.43.343.17 and earlier

#### 1.2.0 (April 22, 2015)
* Made Crosswalk command-line configurable via `<preference name="xwalkCommandLine" value="..." />`
* Disabled pull-down-to-refresh by default

#### 1.1.0 (April 21, 2015)
* Based on Crosswalk v13
* Made Crosswalk version configurable via `<preference name="xwalkVersion" value="..." />`

#### 1.0.0 (Mar 25, 2015)
* Initial release
* Based on Crosswalk v11
