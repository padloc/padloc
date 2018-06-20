# cordova-plugin-wkwebview-inputfocusfix
Cordova plugin for fixing auto focus issue of html elements on WKWebView. 

Currently WKWebView doesn't focus on elements on js .focus() calls. This plugin is extension of CDVWKWebViewEngine class which does ugly swizzling for the focus. Original idea is on: https://github.com/Telerik-Verified-Plugins/WKWebView/commit/04e8296adeb61f289f9c698045c19b62d080c7e3#L609-L620 

## Installation

Install the plugin by running:
```
cordova plugin add cordova-plugin-wkwebview-inputfocusfix
```

## Lifetime

The plugin should be out of use once https://github.com/apache/cordova-plugin-wkwebview-engine/pull/37/ and https://github.com/ionic-team/cordova-plugin-wkwebview-engine/pull/171 is merged. Please watch main WKWebView repositories for the merge.
