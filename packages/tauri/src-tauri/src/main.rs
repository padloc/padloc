#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .menu(tauri::menu::Menu::default)
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
