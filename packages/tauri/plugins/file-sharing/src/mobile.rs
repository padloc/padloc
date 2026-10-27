use tauri::{plugin::PluginHandle, Runtime};

pub struct NativePlugin<R: Runtime>(pub PluginHandle<R>);

impl<R: Runtime> NativePlugin<R> {
    pub async fn share_file(
        &self,
        name: String,
        data: String,
    ) -> Result<serde_json::Value, String> {
        if name.is_empty()
            || name.len() > 240
            || name == "."
            || name == ".."
            || name.contains('/')
            || name.contains('\\')
            || name.chars().any(char::is_control)
            || data.len() > 90 * 1024 * 1024
        {
            return Err("Invalid file sharing request.".into());
        }
        self.0
            .run_mobile_plugin_async("share", serde_json::json!({"name":name,"data":data}))
            .await
            .map_err(|_| "Unable to share the file. Please try again.".into())
    }
}
