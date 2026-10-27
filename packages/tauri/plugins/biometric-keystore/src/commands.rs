use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn biometric_status<R: Runtime>(
    app: AppHandle<R>,
) -> Result<serde_json::Value, serde_json::Value> {
    app.state::<crate::NativePlugin<R>>()
        .biometric_status()
        .await
}

#[tauri::command]
pub async fn biometric_store<R: Runtime>(
    app: AppHandle<R>,
    id: String,
    key: String,
) -> Result<serde_json::Value, serde_json::Value> {
    app.state::<crate::NativePlugin<R>>()
        .biometric_store(id, key)
        .await
}

#[tauri::command]
pub async fn biometric_get<R: Runtime>(
    app: AppHandle<R>,
    id: String,
) -> Result<serde_json::Value, serde_json::Value> {
    app.state::<crate::NativePlugin<R>>()
        .biometric_get(id)
        .await
}
