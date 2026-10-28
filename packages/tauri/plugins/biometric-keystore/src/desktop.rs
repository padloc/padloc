use tauri::{AppHandle, Runtime};

pub struct NativePlugin<R: Runtime> {
    pub _app: AppHandle<R>,
}

type Response = Result<serde_json::Value, serde_json::Value>;
fn unsupported() -> serde_json::Value {
    serde_json::json!({"code": "not_supported", "message": "Protected biometric storage is not implemented on this platform."})
}

impl<R: Runtime> NativePlugin<R> {
    pub async fn biometric_status(&self) -> Response {
        Ok(serde_json::json!({"available": false, "kind": "none"}))
    }
    pub async fn biometric_store(&self, _id: String, _key: String) -> Response {
        Err(unsupported())
    }
    pub async fn biometric_get(&self, _id: String) -> Response {
        Err(unsupported())
    }
}
