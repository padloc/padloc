fn reader_script(report: &str) -> String {
  let script = include_str!("../native/migration-reader.js")
    .trim()
    .trim_end_matches(';');
  format!("({script})({report});")
}

#[cfg(target_os = "ios")]
mod ios {
  use std::ffi::{c_char, CStr, CString};
  use std::sync::Mutex;
  static READER: Mutex<()> = Mutex::new(());
  extern "C" {
    fn padloc_read_cordova_storage(script: *const c_char) -> *mut c_char;
    fn padloc_migration_free(value: *mut c_char);
  }
  pub async fn read() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(|| {
      let _guard = READER.lock().map_err(|_| "Migration reader unavailable.")?;
      let script = CString::new(super::reader_script(
        "value => window.webkit.messageHandlers.padlocMigration.postMessage(value)",
      ))
      .map_err(|_| "Migration reader unavailable.")?;
      unsafe {
        let pointer = padloc_read_cordova_storage(script.as_ptr());
        if pointer.is_null() {
          return Err("Migration reader unavailable.".into());
        }
        let value = serde_json::from_slice(CStr::from_ptr(pointer).to_bytes());
        padloc_migration_free(pointer);
        value.map_err(|_| "Migration reader unavailable.".into())
      }
    })
    .await
    .map_err(|_| "Migration reader unavailable.".to_string())?
  }
}

#[cfg(target_os = "ios")]
#[tauri::command]
pub async fn read_cordova_storage() -> Result<serde_json::Value, String> {
  ios::read().await
}

#[cfg(target_os = "android")]
#[tauri::command]
pub async fn read_cordova_storage(
  reader: tauri::State<'_, tauri_plugin_cordova_migration::LegacyReader<tauri::Wry>>,
) -> Result<serde_json::Value, String> {
  let script = reader_script("value => { window.padlocMigrationResult = value; }");
  let mut result = serde_json::json!({ "status": "absent", "origin": "https://localhost" });
  for (origin, https) in [("https://localhost", true), ("http://localhost", false)] {
    let response = reader.read(&script, https).await?;
    let mut response: serde_json::Value =
      serde_json::from_str(&response).map_err(|_| "Migration reader unavailable.")?;
    match response["status"].as_str() {
      Some("absent") => (),
      Some("found") => {
        let entries = response["entries"]
          .as_array()
          .ok_or("Invalid legacy storage response.")?;
        if !entries.is_empty() {
          if result["status"] == "found" {
            return Err("Both Cordova origins contain local data.".into());
          }
          response["origin"] = origin.into();
          result = response;
        }
      }
      _ => return Err("Legacy storage could not be read.".into()),
    }
  }
  Ok(result)
}
