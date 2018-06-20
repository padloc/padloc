<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

cordova-plugin-compat
------------------------

This repo is for remaining backwards compatible with previous versions of Cordova.

## Deprecated

> This plugin is no longer being worked on as the functionality provided by this plugin is now included in cordova-android 6.3.0. You should upgrade your application to use version 1.2.0 of this plugin. It will detect whether or not the plugin is required based on the version of cordova-android your app uses.

## USAGE

Your plugin can depend on this plugin and use it to handle the new run time permissions Android 6.0.0 (cordova-android 5.0.0) introduced. 

View [this commit](https://github.com/apache/cordova-plugin-camera/commit/a9c18710f23e86f5b7f8918dfab7c87a85064870) to see how to depend on `cordova-plugin-compat`. View [this file](https://github.com/apache/cordova-plugin-camera/blob/master/src/android/CameraLauncher.java) to see how `PermissionHelper` is being used to request and store permissions. Read more about Android permissions at http://cordova.apache.org/docs/en/latest/guide/platforms/android/plugin.html#android-permissions.
