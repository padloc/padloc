(function () {
	function activatedHandler(e) {
		if (typeof handleOpenURL == 'function' && e.uri) {
			handleOpenURL(e.uri.rawUri);
		}
	};
	
	var wui = Windows.UI.WebUI.WebUIApplication;
	wui.addEventListener("activated", activatedHandler, false);
}());
