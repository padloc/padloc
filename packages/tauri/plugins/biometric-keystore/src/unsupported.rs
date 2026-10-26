#[tauri::command]
pub async fn biometric_status() -> Result<serde_json::Value, serde_json::Value> {
    Ok(serde_json::json!({"available": false, "kind": "none"}))
}
fn unsupported() -> serde_json::Value {
    serde_json::json!({"code": "not_supported", "message": "Protected biometric storage is not implemented on this platform."})
}
#[tauri::command]
pub async fn biometric_store(id: String, key: String) -> Result<serde_json::Value, serde_json::Value> {
    let _ = (id, key);
    Err(unsupported())
}
#[tauri::command]
pub async fn biometric_get(id: String) -> Result<serde_json::Value, serde_json::Value> {
    let _ = id;
    Err(unsupported())
}
