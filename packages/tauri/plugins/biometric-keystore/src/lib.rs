use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "ios")]
#[path = "ios.rs"]
mod commands;
#[cfg(target_os = "android")]
#[path = "android.rs"]
mod commands;
#[cfg(not(any(target_os = "ios", target_os = "android")))]
#[path = "unsupported.rs"]
mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("biometric-keystore")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                app.manage(commands::AndroidPlugin(api.register_android_plugin("app.padloc.plugins.biometric", "BiometricKeyStorePlugin")?));
            }
            #[cfg(not(target_os = "android"))]
            let _ = (app, api);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::biometric_status, commands::biometric_store, commands::biometric_get])
        .build()
}
