#[tauri::command]
pub async fn share_file(name: String, data: String) -> Result<serde_json::Value, String> {
    let _ = (name, data);
    Err("Native file sharing is not implemented on this platform.".into())
}
