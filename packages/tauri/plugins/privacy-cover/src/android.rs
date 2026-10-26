use tauri::{plugin::PluginHandle, AppHandle, Manager, Runtime};

pub struct AndroidPlugin<R: Runtime>(pub PluginHandle<R>);

#[tauri::command]
pub async fn background_state<R: Runtime>(app: AppHandle<R>) -> Result<serde_json::Value, String> {
    app.state::<AndroidPlugin<R>>().0.run_mobile_plugin_async("backgroundState", ())
        .await.map_err(|_| "Unable to read native background state.".into())
}

#[tauri::command]
pub async fn resume_complete<R: Runtime>(app: AppHandle<R>, generation: u64) -> Result<(), String> {
    let _: serde_json::Value = app.state::<AndroidPlugin<R>>().0
        .run_mobile_plugin_async("resumeComplete", serde_json::json!({ "generation": generation }))
        .await.map_err(|_| "Unable to acknowledge native resume.".to_string())?;
    Ok(())
}
