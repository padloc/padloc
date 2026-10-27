use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn share_file<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    data: String,
) -> Result<serde_json::Value, String> {
    app.state::<crate::NativePlugin<R>>()
        .share_file(name, data)
        .await
}
