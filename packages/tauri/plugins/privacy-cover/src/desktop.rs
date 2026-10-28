use tauri::{AppHandle, Runtime};

pub struct NativePlugin<R: Runtime> {
    pub _app: AppHandle<R>,
}

impl<R: Runtime> NativePlugin<R> {
    pub async fn background_state(&self) -> Result<serde_json::Value, String> {
        Err("Native privacy protection is not implemented on this platform.".into())
    }
    pub async fn resume_complete(&self, _generation: u64) -> Result<(), String> {
        Err("Native privacy protection is not implemented on this platform.".into())
    }
}
