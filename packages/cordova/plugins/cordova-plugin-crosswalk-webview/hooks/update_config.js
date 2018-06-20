#!/usr/bin/env node

module.exports = function(context) {

    var ConfigParser, XmlHelpers;
    try {
        // cordova-lib >= 5.3.4 doesn't contain ConfigParser and xml-helpers anymore
        ConfigParser = context.requireCordovaModule("cordova-common").ConfigParser;
        XmlHelpers = context.requireCordovaModule("cordova-common").xmlHelpers;
    } catch (e) {
        ConfigParser = context.requireCordovaModule("cordova-lib/src/configparser/ConfigParser");
        XmlHelpers = context.requireCordovaModule("cordova-lib/src/util/xml-helpers");
    }

    /** @external */
    var fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        et = context.requireCordovaModule('elementtree');

    /** @defaults */
    var xwalkVariables = {},
        argumentsString = context.cmdLine,
        pluginConfigurationFile = path.join(context.opts.plugin.dir, 'plugin.xml'),
        androidPlatformDir = path.join(context.opts.projectRoot,
            'platforms', 'android'),
        projectConfigurationFile = path.join(context.opts.projectRoot,
            'config.xml'),
        platformConfigurationFile,
        projectManifestFile = path.join(androidPlatformDir,
            'AndroidManifest.xml'),
        xwalk64bit = "xwalk64bit",
        xwalkLiteVersion = "",
        specificVersion = false;

    var oldConfigXMLLocation = path.join(androidPlatformDir, 'res', 'xml', 'config.xml');
    var newConfigXMLLocation = path.join(androidPlatformDir, 'app', 'src', 'main', 'res', 'xml', 'config.xml');

    if (fs.existsSync(newConfigXMLLocation)) {
        // cordova-android >= 7.0.0
        platformConfigurationFile = newConfigXMLLocation;
    } else {
        // cordova-android < 7.0.0
        platformConfigurationFile = oldConfigXMLLocation;
    }

    /** Init */
    var CordovaConfig = new ConfigParser(platformConfigurationFile);

    var addPermission = function() {
        var projectManifestXmlRoot = XmlHelpers.parseElementtreeSync(projectManifestFile);
        var child = et.XML('<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />');
        XmlHelpers.graftXML(projectManifestXmlRoot, [child], '/manifest');
        fs.writeFileSync(projectManifestFile, projectManifestXmlRoot.write({indent: 4}), 'utf-8');
    }

    var removePermission = function() {
        var projectManifestXmlRoot = XmlHelpers.parseElementtreeSync(projectManifestFile);
        var child = et.XML('<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />');
        XmlHelpers.pruneXML(projectManifestXmlRoot, [child], '/manifest');
        fs.writeFileSync(projectManifestFile, projectManifestXmlRoot.write({indent: 4}), 'utf-8');
    }

    var defaultPreferences = function() {
        var pluginPreferences = {};

        var pluginXmlRoot = XmlHelpers.parseElementtreeSync(pluginConfigurationFile),
            tagName = "preference",
            containerName = "config-file",
            targetPlatform = 'android',
            targetPlatformTag = pluginXmlRoot.find('./platform[@name="' + targetPlatform + '"]');

        var tagsInRoot = pluginXmlRoot.findall(tagName) || [],
            tagsInPlatform = targetPlatformTag ? targetPlatformTag.findall(tagName) : [],
            tagsInContainer = targetPlatformTag ? targetPlatformTag.findall(containerName) : [],
            tagsList = tagsInRoot.concat(tagsInContainer);

        // Parses <preference> tags within <config-file>-blocks
        tagsList.map(function(prefTag) {
            prefTag.getchildren().forEach(function(element) {
                if ((element.tag == 'preference') && (element.attrib['name']) && element.attrib['default']) {
                    // Don't add xwalkLiteVersion in the app/config.xml
                    if (element.attrib['name'] == "xwalkLiteVersion") {
                        xwalkLiteVersion = element.attrib['default'];
                    } else {
                        pluginPreferences[element.attrib['name']] = element.attrib['default'];
                    }
                }
            });
        });

        return pluginPreferences;
    }

    /** The style of name align with config.xml */
    var setConfigPreference = function(name, value) {
        var trimName = name.replace('_', '');
        for (var localName in xwalkVariables) {
            if (localName.toUpperCase() == trimName.toUpperCase()) {
                xwalkVariables[localName] = value;
                if (localName == 'xwalkVersion') {
                    specificVersion = true;
                }
            }
        }
    }

    /** Pase the cli command to get the specific preference*/
    var parseCliPreference = function() {
        var commandlineVariablesList = argumentsString.split('--variable');
        if (commandlineVariablesList) {
            commandlineVariablesList.forEach(function(element) {
                element = element.trim();
                if(element && element.indexOf('XWALK') == 0) {
                    var preference = element.split('=');
                    if (preference && preference.length == 2) {
                        setConfigPreference(preference[0], preference[1]);
                    }
                }
            });
        }
    }

    /** Add preference */
    this.addPreferences = function() {
        // Pick the xwalk variables with the cli preferences
        // parseCliPreference();

        // Add the permission of writing external storage when using shared mode
        if (CordovaConfig.getGlobalPreference('xwalkMode') == 'shared') {
            addPermission();
        }

        // Configure the final value in the config.xml
        // var configXmlRoot = XmlHelpers.parseElementtreeSync(projectConfigurationFile);
        // var preferenceUpdated = false;
        // for (var name in xwalkVariables) {
        //     var child = configXmlRoot.find('./preference[@name="' + name + '"]');
        //     if(!child) {
        //         preferenceUpdated = true;
        //         child = et.XML('<preference name="' + name + '" value="' + xwalkVariables[name] + '" />');
        //         XmlHelpers.graftXML(configXmlRoot, [child], '/*');
        //     }
        // }
        // if(preferenceUpdated) {
        //     fs.writeFileSync(projectConfigurationFile, configXmlRoot.write({indent: 4}), 'utf-8');
        // }
    }

    /** Remove preference*/
    this.removePreferences = function() {
        if (CordovaConfig.getGlobalPreference('xwalkMode') == 'shared') {
            // Add the permission of write_external_storage in shared mode
            removePermission();
        }

        // var configXmlRoot = XmlHelpers.parseElementtreeSync(projectConfigurationFile);
        // for (var name in xwalkVariables) {
        //     var child = configXmlRoot.find('./preference[@name="' + name + '"]');
        //     if (child) {
        //         XmlHelpers.pruneXML(configXmlRoot, [child], '/*');
        //     }
        // }
        // fs.writeFileSync(projectConfigurationFile, configXmlRoot.write({indent: 4}), 'utf-8');
    }

    var build64bit = function() {
        var build64bit = false;
        var commandlineVariablesList = argumentsString.split('--');

        if (commandlineVariablesList) {
            commandlineVariablesList.forEach(function(element) {
                element = element.trim();
                if(element && element.indexOf(xwalk64bit) == 0) {
                    build64bit = true;
                }
            });
        }
        return build64bit;
    }

    this.beforeBuild64bit = function() {
        if(build64bit()) {
            var configXmlRoot = XmlHelpers.parseElementtreeSync(projectConfigurationFile);
            var child = configXmlRoot.find('./preference[@name="' + xwalk64bit + '"]');
            if(!child) {
                child = et.XML('<preference name="' + xwalk64bit + '" value="' + xwalk64bit + '" />');
                XmlHelpers.graftXML(configXmlRoot, [child], '/*');
                fs.writeFileSync(projectConfigurationFile, configXmlRoot.write({indent: 4}), 'utf-8');
            }
        }
    }

    this.afterBuild64bit = function() {
        if(build64bit()) {
            var configXmlRoot = XmlHelpers.parseElementtreeSync(projectConfigurationFile);
            var child = configXmlRoot.find('./preference[@name="' + xwalk64bit + '"]');
            if (child) {
                XmlHelpers.pruneXML(configXmlRoot, [child], '/*');
                fs.writeFileSync(projectConfigurationFile, configXmlRoot.write({indent: 4}), 'utf-8');
            }
        }

        console.log("Crosswalk info:");
        console.log("        After much discussion and analysis of the market,");
        console.log("        we have decided to discontinue support for Android 4.0 (ICS) in Crosswalk starting with version 20,");
        console.log("        so the minSdkVersion of Cordova project is configured to 16 by default. \n");
    }

    xwalkVariables = defaultPreferences();

};
