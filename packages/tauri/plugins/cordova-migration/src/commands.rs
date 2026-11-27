use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn read_cordova_storage<R: Runtime>(
    app: AppHandle<R>,
) -> Result<serde_json::Value, String> {
    app.state::<crate::LegacyReader<R>>().read().await
}
