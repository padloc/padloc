use tauri::{Menu, MenuItem, Submenu, CustomMenuItem};

pub trait AddDefaultSubmenus {
  fn add_default_app_submenu_if_macos(self, app_name: &str) -> Self;
  fn add_default_file_submenu(self) -> Self;
  fn add_default_edit_submenu(self) -> Self;
  fn add_default_view_submenu(self) -> Self;
  fn add_default_window_submenu(self) -> Self;
  fn add_default_help_submenu(self) -> Self;
}

impl AddDefaultSubmenus for Menu {
  fn add_default_app_submenu_if_macos(self, app_name: &str) -> Menu {
    #[cfg(target_os = "macos")]
    return self.add_submenu(Submenu::new(
      app_name.to_string(),
      Menu::new()
        .add_native_item(MenuItem::About(app_name.to_string()), {})
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Services)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Hide)
        .add_native_item(MenuItem::HideOthers)
        .add_native_item(MenuItem::ShowAll)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit),
    ));
    #[cfg(not(target_os = "macos"))]
    return self;
  }
  fn add_default_file_submenu(self) -> Menu {
    #[cfg(not(target_os = "macos"))]
    return self;
    self.add_submenu(Submenu::new(
      "File",
      Menu::new().add_native_item(MenuItem::CloseWindow),
    ))
  }

  fn add_default_edit_submenu(self) -> Menu {
    #[cfg(target_os = "linux")]
    return self;
    self.add_submenu(Submenu::new("Edit", {
      let mut menu = Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste);
      #[cfg(not(target_os = "macos"))]
      {
        menu = menu.add_native_item(MenuItem::Separator);
      }
      menu = menu.add_native_item(MenuItem::SelectAll);
      // macOS automatically adds "Start Dictation" and "Emoji & Symbols" to
      // the bottom of the Edit menu
      menu
    }))
  }

  fn add_default_view_submenu(self) -> Menu {
    #[cfg(target_os = "linux")]
    return self;
    self.add_submenu(Submenu::new(
      "View",
      Menu::new().add_native_item(MenuItem::EnterFullScreen),
    ))
  }

  fn add_default_window_submenu(self) -> Menu {
    #[cfg(target_os = "linux")]
    return self;
    self.add_submenu(Submenu::new(
      "Window",
      Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::Zoom),
    ))
  }

  fn add_default_help_submenu(self) -> Menu {
    #[cfg(target_os = "linux")]
    return self;
    self.add_submenu(Submenu::new(
      "Help",
      Menu::new()
        .add_item(CustomMenuItem::new("get_help", "Get Help"))
    ))
  }
}
