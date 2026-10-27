use tauri::{plugin::PluginHandle, Runtime};

pub struct NativePlugin<R: Runtime>(pub PluginHandle<R>);

impl<R: Runtime> NativePlugin<R> {
    pub async fn background_state(&self) -> Result<serde_json::Value, String> {
        self.0
            .run_mobile_plugin_async("backgroundState", ())
            .await
            .map_err(|_| "Unable to read native background state.".into())
    }

    pub async fn resume_complete(&self, generation: u64) -> Result<(), String> {
        let _: serde_json::Value = self
            .0
            .run_mobile_plugin_async(
                "resumeComplete",
                serde_json::json!({ "generation": generation }),
            )
            .await
            .map_err(|_| "Unable to acknowledge native resume.".to_string())?;
        Ok(())
    }
}
