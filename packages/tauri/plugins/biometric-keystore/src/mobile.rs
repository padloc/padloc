use tauri::{
    plugin::{mobile::PluginInvokeError, PluginHandle},
    Runtime,
};

pub struct NativePlugin<R: Runtime>(pub PluginHandle<R>);
type Response = Result<serde_json::Value, serde_json::Value>;

fn error(error: PluginInvokeError) -> serde_json::Value {
    if let PluginInvokeError::InvokeRejected(response) = error {
        serde_json::json!({ "code": response.code.unwrap_or_else(|| "authentication_failed".into()),
            "message": response.message.unwrap_or_else(|| "Biometric authentication failed.".into()) })
    } else {
        serde_json::json!({ "code": "authentication_failed", "message": "Unable to access protected biometric storage." })
    }
}

impl<R: Runtime> NativePlugin<R> {
    pub async fn biometric_status(&self) -> Response {
        self.0
            .run_mobile_plugin_async("status", ())
            .await
            .map_err(error)
    }
    pub async fn biometric_store(&self, id: String, key: String) -> Response {
        if id.len() > 128 || key.len() > 64 {
            return Err(
                serde_json::json!({"code":"invalid_request", "message":"Invalid biometric key request."}),
            );
        }
        self.0
            .run_mobile_plugin_async("store", serde_json::json!({"id":id,"key":key}))
            .await
            .map_err(error)
    }
    pub async fn biometric_get(&self, id: String) -> Response {
        if id.len() > 128 {
            return Err(
                serde_json::json!({"code":"invalid_request", "message":"Invalid biometric key identifier."}),
            );
        }
        self.0
            .run_mobile_plugin_async("get", serde_json::json!({"id":id}))
            .await
            .map_err(error)
    }
}
