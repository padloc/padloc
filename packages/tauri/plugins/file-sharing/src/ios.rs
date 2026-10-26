use std::ffi::{c_char, CStr, CString};
use std::sync::Mutex;

static SHARE: Mutex<()> = Mutex::new(());
extern "C" {
    fn padloc_share_file(name: *const c_char, data: *const c_char) -> *mut c_char;
    fn padloc_share_free(value: *mut c_char);
    fn padloc_share_cleanup();
}

pub fn cleanup() { unsafe { padloc_share_cleanup() } }

#[tauri::command]
pub async fn share_file(name: String, data: String) -> Result<serde_json::Value, String> {
    if name.is_empty() || name.len() > 240 || name == "." || name == ".." ||
        name.contains('/') || name.contains('\\') || name.chars().any(char::is_control) || data.len() > 90 * 1024 * 1024 {
        return Err("Invalid file sharing request.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = SHARE.lock().map_err(|_| "Unable to share the file.")?;
        let name = CString::new(name).map_err(|_| "Invalid file name.")?;
        let data = CString::new(data).map_err(|_| "Invalid file data.")?;
        unsafe {
            let pointer = padloc_share_file(name.as_ptr(), data.as_ptr());
            if pointer.is_null() { return Err("Unable to share the file.".into()); }
            let value = serde_json::from_slice::<serde_json::Value>(CStr::from_ptr(pointer).to_bytes());
            padloc_share_free(pointer);
            let value = value.map_err(|_| "Invalid file sharing response.")?;
            if value.get("error").is_some() { Err("Unable to share the file. Please try again.".into()) }
            else { Ok(value) }
        }
    }).await.map_err(|_| "Unable to share the file.".to_string())?
}
