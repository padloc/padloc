(function () {
    function activatedHandlerWinUI(e) {
        if (typeof handleOpenURL == 'function' && e.uri) {
            handleOpenURL(e.uri.rawUri);
        }
    };

	if (typeof Windows != 'undefined') {
	    var wui = Windows.UI.WebUI.WebUIApplication;
	    wui.addEventListener("activated", activatedHandlerWinUI, false);
	}
}());