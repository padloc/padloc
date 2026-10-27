use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(any(target_os = "ios", target_os = "android"))]
mod mobile;
#[cfg(any(target_os = "ios", target_os = "android"))]
use mobile::NativePlugin;
#[cfg(not(any(target_os = "ios", target_os = "android")))]
mod desktop;
#[cfg(not(any(target_os = "ios", target_os = "android")))]
use desktop::NativePlugin;

mod commands;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_biometric_keystore);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("biometric-keystore")
        .setup(|app, api| {
            #[cfg(any(target_os = "ios", target_os = "android"))]
            {
                use tauri::Manager;
                #[cfg(target_os = "android")]
                let handle = api.register_android_plugin(
                    "app.padloc.plugins.biometric",
                    "BiometricKeyStorePlugin",
                )?;
                #[cfg(target_os = "ios")]
                let handle = api.register_ios_plugin(init_plugin_biometric_keystore)?;
                app.manage(NativePlugin(handle));
            }
            #[cfg(not(any(target_os = "ios", target_os = "android")))]
            {
                use tauri::Manager;
                let _ = api;
                app.manage(NativePlugin { _app: app.clone() });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::biometric_status,
            commands::biometric_store,
            commands::biometric_get
        ])
        .build()
}
