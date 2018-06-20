# Custom URL scheme PhoneGap Plugin
#### launch your app by a link like this: `mycoolapp://`
for iOS, Android and WP, by [Eddy Verbruggen](http://www.x-services.nl)
- This repo is for PhoneGap 3.0.0 and up
- For PhoneGap 2.9.0 and lower, [switch to the phonegap-2.9.0-and-lower branch](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin/tree/phonegap-2.9.0-and-lower)

1. [Description](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#1-description)
2. [Installation](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#2-installation)
	2. [Automatically (CLI / Plugman)](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#automatically-cli--plugman)
	2. [Manually](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#manually)
	2. [PhoneGap Build](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#phonegap-build)
3. [Usage](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#3-usage)
	2. [iOS](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#ios-usage)
	2. [Meteor](https://github.com/EddyVerbruggen/Custom-URL-scheme#meteor--getlastintent-android-only)
4. [URL Scheme hints](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#4-url-scheme-hints)
5. [License](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#5-license)


### BEWARE: 
### - [This Apache Cordova issue](https://issues.apache.org/jira/browse/CB-7606) causes problems with Cordova-iOS 3.7.0: the `handleOpenURL` function is not invoked upon cold start. Use a higher or lower version than 3.7.0.
### - As of iOS 9.2, the dialog `Open in "mycoolapp"?` no longer blocks JS, so if you have a short timeout that opens the app store, the user will be taken to the store before they have a chance to see and answer the dialog. [See below](https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin#ios-usage) for available solutions.

## 1. Description

This plugin allows you to start your app by calling it with a URL like `mycoolapp://path?foo=bar`

* Compatible with [Cordova Plugman](https://github.com/apache/cordova-plugman)
* Submitted and waiting for approval at PhoneGap Build ([more information](https://build.phonegap.com/plugins))

### iOS specifics
* Forget about [using config.xml to define a URL scheme](https://build.phonegap.com/docs/config-xml#url_schemes). This plugin adds 2 essential enhancements:
  - Uniform URL scheme with Android (for which there is no option to define a URL scheme via PhoneGap configuration at all).
  - You still need to wire up the Javascript to handle incoming events. This plugin assists you with that.
* Tested on iOS 5.1, 6 and 7.

### Android specifics
* Unlike iOS, there is no way to use config.xml to define a scheme for your app. Now there is.
* Tested on Android 4.3, will most likely work with 2.2 and up.
* If you're trying to launch your app from an In-App Browser it opened previously, then [use this In-App Browser plugin fork](https://github.com/Innovation-District/cordova-plugin-inappbrowser) which allows that.
* In case you have a multi-page app (multiple HTML files, and all implementing handleOpenURL), set the preference `CustomURLSchemePluginClearsAndroidIntent` to `true` in `config.xml` so the function won't be triggered multiple times. Note that this may interfere with other plugins requiring the intent data.


## 2. Installation

### Automatically (CLI / Plugman)
LaunchMyApp is compatible with [Cordova Plugman](https://github.com/apache/cordova-plugman).
Replace `mycoolapp` by a nice scheme you want to have your app listen to:

Latest release on npm:
```
$ cordova plugin add cordova-plugin-customurlscheme --variable URL_SCHEME=mycoolapp
```

Bleeding edge master version from Github:
```
$ cordova plugin add https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin.git --variable URL_SCHEME=mycoolapp
```
(Note that the Phonegap CLI didn't support `--variable` before version 3.6.3, so please use the Cordova CLI as shown above in case you're on an older version)

The LaunchMyApp.js file is brought in automatically.

Note for iOS: there was a bug in CLI which caused an error in your `*-Info.plist`.
Please manually remove the blank line and whitespace (if any) from `NSMainNibFile` and `NSMainNibFile~ipad` (or your app won't start at all).


### Manually
Don't shoot yourself in the foot - use the CLI! That being said, here goes:

#### iOS
1\. `Copy www/ios/LaunchMyApp.js` to `www/js/plugins/LaunchMyApp.js` and reference it in your `index.html`:
```html
<script type="text/javascript" src="js/plugins/LaunchMyApp.js"></script>
```

2\. Add this to your `*-Info.plist` (replace `URL_SCHEME` by a nice scheme you want to have your app listen to, like `mycoolapp`):
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>URL_SCHEME</string>
    </array>
  </dict>
</array>
```

#### Android
1\. Copy www/android/LaunchMyApp.js to www/js/plugins/LaunchMyApp.js and reference it in your `index.html`:
```html
<script type="text/javascript" src="js/plugins/LaunchMyApp.js"></script>
```

2\. Add the following xml to your `config.xml` to always use the latest version of this plugin:
```xml
<plugin name="LaunchMyApp" value="nl.xservices.plugins.LaunchMyApp"/>
```

3\. Copy `LaunchMyApp.java` to `platforms/android/src/nl/xservices/plugins` (create the folders)

4\. Add the following to your `AndroidManifest.xml` inside the `/manifest/application/activity` node (replace `URL_SCHEME` by a nice scheme you want to have your app listen to, like `mycoolapp`):
```xml
<intent-filter>
  <data android:scheme="URL_SCHEME"/>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
</intent-filter>
```

5\. In `AndroidManifest.xml` set the launchMode to singleTask to avoid issues like [#24]. `<activity android:launchMode="singleTask" ..`

### PhoneGap Build

Using LaunchMyApp with PhoneGap Build requires you to add the following xml to your `config.xml` to use the latest version of this plugin (replace `mycoolapp` by a nice scheme you want to have your app listen to):
```xml
<gap:plugin name="cordova-plugin-customurlscheme" source="npm">
  <param name="URL_SCHEME" value="mycoolapp" />
</gap:plugin>
```

The LaunchMyApp.js file is brought in automatically.

NOTE: When Hydration is enabled at PGB, this plugin may not work.

### Restoring cordova plugin settings on plugin add or update
In order to be able to restore the plugin settings on `cordova plugin add`, one need to add the following feature into config.xml. Note that if you added the plugin with the `--save` param you will find this in your `config.xml` already, except for the `variable` tag which is likely a `param` tag. [Change that.](https://github.com/EddyVerbruggen/Custom-URL-scheme/issues/76)
```xml
  <feature name="Custom URL scheme">
    <param name="id" value="cordova-plugin-customurlscheme" />
    <param name="url" value="https://github.com/EddyVerbruggen/LaunchMyApp-PhoneGap-Plugin.git" />
    <variable name="URL_SCHEME" value="mycoolapp" /><!-- change as appropriate -->
  </feature>
```

Please notice that URL_SCHEME is saved as `variable`, not as `prop`. However if you do `cordova plugin add` with a --save option, cordova will write the URL_SCHEME as a `prop`, you need to change the tag name from `param` to `variable` in this case.

These plugin restore instructions are tested on:
cordova-cli 4.3.+ and cordova-android 3.7.1+


## 3. Usage

1a\. Your app can be launced by linking to it like this from a website or an email for example (all of these will work):
```html
<a href="mycoolapp://">Open my app</a>
<a href="mycoolapp://somepath">Open my app</a>
<a href="mycoolapp://somepath?foo=bar">Open my app</a>
<a href="mycoolapp://?foo=bar">Open my app</a>
```

`mycoolapp` is the value of URL_SCHEME you used while installing this plugin.

1b\. If you're trying to open your app from another PhoneGap app, use the InAppBrowser plugin and launch the receiving app like this, to avoid a 'protocol not supported' error:
```html
<button onclick="window.open('mycoolapp://', '_system')">Open the other app</button>
```

2\. When your app is launched by a URL, you probably want to do something based on the path and parameters in the URL. For that, you could implement the (optional) `handleOpenURL(url)` method, which receives the URL that was used to launch your app.
```javascript
function handleOpenURL(url) {
  console.log("received url: " + url);
}
```

If you want to alert the URL for testing the plugin, at least on iOS you need to wrap it in a timeout like this:
```javascript
function handleOpenURL(url) {
  setTimeout(function() {
    alert("received url: " + url);
  }, 0);
}
```
A more useful implementation would mean parsing the URL, saving any params to sessionStorage and redirecting the app to the correct page inside your app.
All this happens before the first page is loaded.

### iOS Usage
A common method of deeplinking is to give the user the URL of a webpage (for instance http://linker.myapp.com/pathfoo) that opens the app if installed or the app store if not. This can be done in the following ways, depending on the desired UX:

1. The page content has a button that says "Install app" and when clicked opens the app store by doing `location.href = 'itms-apps://itunes.apple.com/us/app/mycoolapp/idfoo'`. On page load, do `location.href = 'mycoolapp://pathfoo'`. If the user has the app, they will see a dialog that says `Open in "mycoolapp"? [Cancel] [Open]`. If the user does not have the app, they will see an alert that says `Cannot Open Page: Safari cannot open the page because the address is invalid`. Once they dismiss the alert, they see the button that opens the app store, and they tap it.
2. The page has two buttons: one that opens the app, and one that opens the app store.
3. On page load, open a Universal Link using [cordova-universal-links-plugin](https://github.com/nordnet/cordova-universal-links-plugin). (A Universal Link either opens the app or the app store.) Then fall back to one of the above methods if Univeral Links is not supported.

You can also use a service that provides pages that do #3 for you, such as [Branch](https://branch.io/).

### CSP - or: `handleOpenURL` doesn't work
The Whitelist plugin will prevent inline JS from executing, unless you whitelist the url scheme. Please see [this SO issue](http://stackoverflow.com/questions/34257097/using-handleopenurl-with-custom-url-scheme-in-cordova/34281420#34281420) for details.

### Meteor / getLastIntent (Android only)
When running a [meteor](meteor.com) app in the cordova environment, `handleOpenURL` doesn't get called after a cold start, because cordova resets the javascript world during startup and our timer waiting for `handleOpenURL` gets vanished (see [#98](https://github.com/EddyVerbruggen/Custom-URL-scheme/issues/98)). To get the intent by which the app was started in a meteor cordova app you need to ask for it from the meteor side with `getLastIntent` like this.
```javascript
Meteor.startup(function() {
  if (Meteor.isCordova) {
    window.plugins.launchmyapp.getLastIntent(function(url) {
      if (intent.indexOf('mycoolapp://' > -1)) {
        console.log("received url: " + url);
      } else {
        return console.log("ignore intent: " + url);
      }
    }, function(error) {
      return console.log("no intent received");
    });
    return;
  }
});
```

## 4. URL Scheme hints
Please choose a URL_SCHEME which which complies to these restrictions:
- Don't use an already registered scheme (like `fb`, `twitter`, `comgooglemaps`, etc).
- Use only lowercase characters.
- Don't use a dash `-` because on Android it will become underscore `_`.
- Use only 1 word (no spaces).

TIP: test your scheme by installing the app on a device or simulator and typing yourscheme:// in the browser URL bar, or create a test HTML page with a link to your app to impress your buddies.


## 5. License

[The MIT License (MIT)](http://www.opensource.org/licenses/mit-license.html)

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
