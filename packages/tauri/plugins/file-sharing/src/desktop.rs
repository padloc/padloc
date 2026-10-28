use tauri::{AppHandle, Runtime};

pub struct NativePlugin<R: Runtime> {
    pub _app: AppHandle<R>,
}

impl<R: Runtime> NativePlugin<R> {
    pub async fn share_file(
        &self,
        _name: String,
        _data: String,
    ) -> Result<serde_json::Value, String> {
        Err("Native file sharing is not implemented on this platform.".into())
    }
}
