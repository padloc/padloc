#[cfg(target_os = "ios")]
mod privacy;
#[cfg(target_os = "ios")]
mod biometric;
#[cfg(target_os = "ios")]
mod share;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().open_js_links_on_click(false).build())
        .plugin(tauri_plugin_clipboard_manager::init());
    #[cfg(target_os = "ios")]
    let builder = builder
        .plugin(tauri_plugin_barcode_scanner::init())
        .invoke_handler(tauri::generate_handler![privacy::background_state, privacy::resume_complete,
            biometric::biometric_status, biometric::biometric_store, biometric::biometric_get, share::share_file])
        .setup(|app| {
            share::cleanup();
            use tauri::Manager;
            let window = app.get_webview_window("main").expect("main webview");
            window.with_webview(|webview| privacy::install(webview.inner()))?;
            Ok(())
        });
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .menu(tauri::menu::Menu::default);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
