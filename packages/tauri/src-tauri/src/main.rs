#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use crate::menu::AddDefaultSubmenus;
use tauri::api::shell;
use tauri::{Menu};

mod menu;

fn main() {
  let ctx = tauri::generate_context!();

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![])
    .menu(
      Menu::new()
        .add_default_app_submenu_if_macos(&ctx.package_info().name)
        .add_default_file_submenu()
        .add_default_edit_submenu()
        .add_default_window_submenu()
        .add_default_help_submenu(),
    )
    .on_menu_event(|event| {
      let event_name = event.menu_item_id();
      match event_name {
        "get_help" => {
          shell::open(
            "https://padloc.app/help/".to_string(),
            None,
          )
          .unwrap();
        }
        _ => {}
      }
    })
    .run(ctx)
    .expect("error while running tauri application");
}
