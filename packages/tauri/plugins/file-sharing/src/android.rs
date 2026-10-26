use tauri::{plugin::PluginHandle, AppHandle, Manager, Runtime};

pub struct AndroidPlugin<R: Runtime>(pub PluginHandle<R>);

#[tauri::command]
pub async fn share_file<R: Runtime>(app: AppHandle<R>, name: String, data: String) -> Result<serde_json::Value, String> {
    if name.is_empty() || name.len() > 240 || name == "." || name == ".." ||
        name.contains('/') || name.contains('\\') || name.chars().any(char::is_control) || data.len() > 90 * 1024 * 1024 {
        return Err("Invalid file sharing request.".into());
    }
    app.state::<AndroidPlugin<R>>().0.run_mobile_plugin_async("share", serde_json::json!({"name":name,"data":data}))
        .await.map_err(|_| "Unable to share the file. Please try again.".into())
}
