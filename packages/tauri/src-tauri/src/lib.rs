#[cfg(target_os = "ios")]
mod privacy;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "ios")]
    let builder = builder
        .invoke_handler(tauri::generate_handler![privacy::background_state, privacy::resume_complete])
        .setup(|app| {
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
