use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "ios")]
#[path = "ios.rs"]
mod commands;
#[cfg(not(target_os = "ios"))]
#[path = "unsupported.rs"]
mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("file-sharing")
        .invoke_handler(tauri::generate_handler![commands::share_file])
        .setup(|_, _| {
            #[cfg(target_os = "ios")]
            commands::cleanup();
            Ok(())
        })
        .build()
}
