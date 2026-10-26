use std::ffi::{c_char, CStr, CString};
use std::sync::Mutex;

static KEYCHAIN: Mutex<()> = Mutex::new(());

extern "C" {
    fn padloc_biometric_status() -> *mut c_char;
    fn padloc_biometric_store(id: *const c_char, key: *const c_char) -> *mut c_char;
    fn padloc_biometric_get(id: *const c_char) -> *mut c_char;
    fn padloc_biometric_free(value: *mut c_char);
}

type Response = Result<serde_json::Value, serde_json::Value>;

fn invalid_request() -> serde_json::Value {
    serde_json::json!({"code": "invalid_request", "message": "Invalid biometric key request."})
}

unsafe fn decode(pointer: *mut c_char) -> Response {
    if pointer.is_null() {
        return Err(serde_json::json!({"code": "keychain_error", "message": "Unable to access biometric storage."}));
    }
    let parsed = serde_json::from_slice::<serde_json::Value>(CStr::from_ptr(pointer).to_bytes());
    padloc_biometric_free(pointer);
    let value = parsed.map_err(|_| invalid_request())?;
    if let Some(error) = value.get("error") {
        Err(error.clone())
    } else {
        Ok(value)
    }
}

#[tauri::command]
pub async fn biometric_status() -> Response {
    tauri::async_runtime::spawn_blocking(|| unsafe { decode(padloc_biometric_status()) })
        .await.map_err(|_| invalid_request())?
}

#[tauri::command]
pub async fn biometric_store(id: String, key: String) -> Response {
    if id.len() > 128 || key.len() > 64 { return Err(invalid_request()); }
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = KEYCHAIN.lock().map_err(|_| invalid_request())?;
        let id = CString::new(id).map_err(|_| invalid_request())?;
        let key = CString::new(key).map_err(|_| invalid_request())?;
        unsafe { decode(padloc_biometric_store(id.as_ptr(), key.as_ptr())) }
    }).await.map_err(|_| invalid_request())?
}

#[tauri::command]
pub async fn biometric_get(id: String) -> Response {
    if id.len() > 128 { return Err(invalid_request()); }
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = KEYCHAIN.lock().map_err(|_| invalid_request())?;
        let id = CString::new(id).map_err(|_| invalid_request())?;
        unsafe { decode(padloc_biometric_get(id.as_ptr())) }
    }).await.map_err(|_| invalid_request())?
}
