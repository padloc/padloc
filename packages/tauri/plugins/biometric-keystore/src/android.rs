use tauri::{plugin::{PluginHandle, mobile::PluginInvokeError}, AppHandle, Manager, Runtime};

pub struct AndroidPlugin<R: Runtime>(pub PluginHandle<R>);
type Response = Result<serde_json::Value, serde_json::Value>;

fn error(error: PluginInvokeError) -> serde_json::Value {
    if let PluginInvokeError::InvokeRejected(response) = error {
        serde_json::json!({ "code": response.code.unwrap_or_else(|| "authentication_failed".into()),
            "message": response.message.unwrap_or_else(|| "Biometric authentication failed.".into()) })
    } else {
        serde_json::json!({ "code": "authentication_failed", "message": "Unable to access protected biometric storage." })
    }
}

#[tauri::command]
pub async fn biometric_status<R: Runtime>(app: AppHandle<R>) -> Response {
    app.state::<AndroidPlugin<R>>().0.run_mobile_plugin_async("status", ()).await.map_err(error)
}
#[tauri::command]
pub async fn biometric_store<R: Runtime>(app: AppHandle<R>, id: String, key: String) -> Response {
    if id.len() > 128 || key.len() > 64 {
        return Err(serde_json::json!({"code":"invalid_request", "message":"Invalid biometric key request."}));
    }
    app.state::<AndroidPlugin<R>>().0.run_mobile_plugin_async("store", serde_json::json!({"id":id,"key":key}))
        .await.map_err(error)
}
#[tauri::command]
pub async fn biometric_get<R: Runtime>(app: AppHandle<R>, id: String) -> Response {
    if id.len() > 128 {
        return Err(serde_json::json!({"code":"invalid_request", "message":"Invalid biometric key identifier."}));
    }
    app.state::<AndroidPlugin<R>>().0.run_mobile_plugin_async("get", serde_json::json!({"id":id}))
        .await.map_err(error)
}
