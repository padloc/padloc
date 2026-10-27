#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::Builder::new().open_js_links_on_click(false).build())
        .plugin(tauri_plugin_privacy_cover::init())
        .plugin(tauri_plugin_biometric_keystore::init())
        .plugin(tauri_plugin_file_sharing::init())
        .plugin(tauri_plugin_clipboard_manager::init());
    #[cfg(target_os = "ios")]
    let builder = builder
        .plugin(tauri_plugin_barcode_scanner::init());
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .menu(tauri::menu::Menu::default);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
