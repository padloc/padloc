module.exports  = function (context) {
    var deferred = context.requireCordovaModule('q').defer(),
        fs = context.requireCordovaModule('fs'),
        path = context.requireCordovaModule('path'),
        projectRoot = context.opts.projectRoot;
        
    // While on AppBuilder this may work, the Cordova CLI doesn't like it
    // (or at least not all versions of it).
    var appXaml = path.join(projectRoot, "App.xaml.cs");
    var mainPageXaml = path.join(projectRoot, "MainPage.xaml.cs");
    try {
        fs.statSync(appXaml);
        fs.statSync(mainPageXaml);
    } catch (err) {
        appXaml = path.join(projectRoot, "platforms", "wp8", "App.xaml.cs");
        mainPageXaml = path.join(projectRoot, "platforms", "wp8", "MainPage.xaml.cs");
        try {
            fs.statSync(appXaml);        
            fs.statSync(mainPageXaml);        
        } catch (err2) {
            console.error("Custom URL Scheme plugin couldn't find your App's xaml file! Try to adjust the file manually according to the 'add-uri-mapper.js' hook.");
            return;
        }
    }

    fs.readFile(appXaml, 'utf8', function (err,data) {
		if (err) {
            console.error("Error while configuring the Custom URL Scheme: " + err);
       		deferred.reject(err);
            return;
		}

		var result = data.replace(/^(\s*?)(RootFrame.NavigationFailed\s*?\+=\s*?RootFrame_NavigationFailed;)/gm,
			"$1$2\n\n$1// Assign the URI-mapper class to the application frame\n$1RootFrame.UriMapper = new CompositeUriMapper();");
        
		fs.writeFile(appXaml, result, 'utf8', function (err) {
			if (err){
				deferred.reject(err);
			} else{
				deferred.resolve();
			}
		});
	});

    fs.readFile(mainPageXaml, 'utf8', function (err,data) {
		if (err) {
            console.error("Error while configuring the Custom URL Scheme: " + err);
       		deferred.reject(err);
            return;
		}

        // first add a line to refer to a new method
		var result = data.replace(/^(\s*?)(this.CordovaView.Loaded\s*?\+=\s*?CordovaView_Loaded;)/gm,
			"$1$2\n\n$1// Wire a handler so we can check for our custom scheme\n$1this.CordovaView.Browser.LoadCompleted += CordovaBrowser_LoadCompleted;");
        
        // now add that new method
		result = result.replace(/^(\s*?)(\/\/ Constructor)/gm,
			"$1void CordovaBrowser_LoadCompleted(object sender, System.Windows.Navigation.NavigationEventArgs e) {\n"+
            "$1\tif (CompositeUriMapper.launchUrl != null) {\n" +
            "$1\t\tstring handleOpenURL = string.Format(\"(function() {{ document.addEventListener('deviceready', function() {{ if (typeof handleOpenURL === 'function') {{ handleOpenURL(\\\"{0}\\\"); }} }}); }})()\", CompositeUriMapper.launchUrl);\n" +
            "$1\t\ttry {\n" +
            "$1\t\t\tthis.CordovaView.CordovaBrowser.InvokeScript(\"eval\", new string[] { handleOpenURL });\n" +
            "$1\t\t} catch (Exception) {}\n" +
            "$1\t\tCompositeUriMapper.launchUrl = null;\n" +
            "$1\t}\n" +
            "$1\tthis.CordovaView.Browser.LoadCompleted -= CordovaBrowser_LoadCompleted;\n" +
            "$1}\n\n" +
            "$1$2");

		fs.writeFile(mainPageXaml, result, 'utf8', function (err) {
			if (err){
				deferred.reject(err);
			} else{
				deferred.resolve();
			}
		});
	});

	return deferred.promise;
}