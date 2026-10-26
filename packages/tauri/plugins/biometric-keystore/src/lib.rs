use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "ios")]
#[path = "ios.rs"]
mod commands;
#[cfg(not(target_os = "ios"))]
#[path = "unsupported.rs"]
mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("biometric-keystore")
        .invoke_handler(tauri::generate_handler![commands::biometric_status, commands::biometric_store, commands::biometric_get])
        .build()
}
