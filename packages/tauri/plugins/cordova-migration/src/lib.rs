use serde_json::json;
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    Manager, Runtime,
};

pub struct LegacyReader<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> LegacyReader<R> {
    pub async fn read(&self, script: &str, https: bool) -> Result<String, String> {
        self.0
            .run_mobile_plugin_async("readStorage", json!({ "script": script, "https": https }))
            .await
            .map_err(|_| "Migration reader unavailable.".into())
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("cordova-migration")
        .setup(|app, api| {
            let handle = api.register_android_plugin(
                "app.padloc.plugins.migration",
                "CordovaMigrationPlugin",
            )?;
            app.manage(LegacyReader(handle));
            Ok(())
        })
        .build()
}
