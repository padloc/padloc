use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod mobile;
use mobile::LegacyReader;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_cordova_migration);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("cordova-migration")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            let handle = api.register_android_plugin(
                "app.padloc.plugins.migration",
                "CordovaMigrationPlugin",
            )?;
            #[cfg(target_os = "ios")]
            let handle = api.register_ios_plugin(init_plugin_cordova_migration)?;
            app.manage(LegacyReader(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::read_cordova_storage])
        .build()
}
