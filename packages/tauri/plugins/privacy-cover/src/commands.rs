use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn background_state<R: Runtime>(app: AppHandle<R>) -> Result<serde_json::Value, String> {
    app.state::<crate::NativePlugin<R>>()
        .background_state()
        .await
}

#[tauri::command]
pub async fn resume_complete<R: Runtime>(app: AppHandle<R>, generation: u64) -> Result<(), String> {
    app.state::<crate::NativePlugin<R>>()
        .resume_complete(generation)
        .await
}
