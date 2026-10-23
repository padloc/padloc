#[cfg(target_os = "ios")]
mod migration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().open_js_links_on_click(false).build())
        .plugin(tauri_plugin_privacy_cover::init())
        .plugin(tauri_plugin_biometric_keystore::init())
        .plugin(tauri_plugin_file_sharing::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init());
    #[cfg(any(target_os = "ios", target_os = "android"))]
    let builder = builder
        .plugin(tauri_plugin_barcode_scanner::init());
    #[cfg(all(target_os = "ios", feature = "migration-probe"))]
    let builder = builder.setup(|app| {
        use tauri::Manager;
        let window = app.get_webview_window("main").expect("main webview");
        window.with_webview(|webview| unsafe {
            extern "C" { fn padloc_legacy_probe(webview: *mut std::ffi::c_void); }
            padloc_legacy_probe(webview.inner());
        })?;
        Ok(())
    });
    #[cfg(target_os = "ios")]
    let builder = builder.invoke_handler(tauri::generate_handler![migration::read_cordova_storage]);
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .menu(tauri::menu::Menu::default);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
