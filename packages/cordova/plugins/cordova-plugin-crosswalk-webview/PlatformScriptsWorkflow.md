### Directions for Non-CLI Android-Only cordova project

* Pull down the Cordova Android
```
$ git clone https://github.com/apache/cordova-android.git
```
* Generate a project, e.g creating HelloWorld
```
$ /path/to/cordova-android/bin/create hello com.example.hello HelloWorld
```
* Navigate to the project folder
```
$ cd hello
```
* Install Crosswalk engine plugin by plugman (version >= 0.22.17)
```
$ plugman install --platform android --plugin https://github.com/MobileChromeApps/cordova-crosswalk-engine.git --project .
```
* Build
```
$ ./cordova/build
```
The build script will automatically fetch the Crosswalk WebView libraries from Crosswalk project download site (https://download.01.org/crosswalk/releases/crosswalk/android/) and build for both X86 and ARM architectures. 

For example, building HelloWorld generates:

```
/path/to/hello/build/outputs/apk/hello-x86-debug.apk
/path/to/hello/build/outputs/apk/hello-armv7-debug.apk
```
