use std::ffi::{c_char, CStr, CString};
use std::sync::Mutex;
static READER: Mutex<()> = Mutex::new(());
extern "C" {
    fn padloc_read_cordova_storage(script: *const c_char) -> *mut c_char;
    fn padloc_migration_free(value: *mut c_char);
}
#[tauri::command]
pub async fn read_cordova_storage() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let _guard = READER.lock().map_err(|_| "Migration reader unavailable.")?;
        let script = CString::new(include_str!("../native/migration-reader.js")).map_err(|_| "Migration reader unavailable.")?;
        unsafe {
            let pointer = padloc_read_cordova_storage(script.as_ptr());
            if pointer.is_null() { return Err("Migration reader unavailable.".into()); }
            let value = serde_json::from_slice(CStr::from_ptr(pointer).to_bytes());
            padloc_migration_free(pointer);
            value.map_err(|_| "Migration reader unavailable.".into())
        }
    }).await.map_err(|_| "Migration reader unavailable.".to_string())?
}
