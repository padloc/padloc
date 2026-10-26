#[tauri::command]
pub fn background_state() -> Result<serde_json::Value, String> {
    Err("Native privacy protection is not implemented on this platform.".into())
}
#[tauri::command]
pub fn resume_complete(generation: u64) -> Result<(), String> {
    let _ = generation;
    Err("Native privacy protection is not implemented on this platform.".into())
}
