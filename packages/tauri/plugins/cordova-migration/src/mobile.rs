use serde_json::{json, Value};
use tauri::{plugin::PluginHandle, Runtime};

pub struct LegacyReader<R: Runtime>(pub PluginHandle<R>);

impl<R: Runtime> LegacyReader<R> {
    #[cfg(target_os = "ios")]
    pub async fn read(&self) -> Result<Value, String> {
        let script = reader_script(
            "value => window.webkit.messageHandlers.padlocMigration.postMessage(value)",
        );
        self.read_native(json!({ "script": script })).await
    }

    #[cfg(target_os = "android")]
    pub async fn read(&self) -> Result<Value, String> {
        let script = reader_script("value => { window.padlocMigrationResult = value; }");
        let mut result = json!({ "status": "absent", "origin": "https://localhost" });
        for (origin, https) in [("https://localhost", true), ("http://localhost", false)] {
            let mut response = self
                .read_native(json!({ "script": script, "https": https }))
                .await?;
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

    async fn read_native(&self, args: Value) -> Result<Value, String> {
        let response: String = self
            .0
            .run_mobile_plugin_async("readStorage", args)
            .await
            .map_err(|_| "Migration reader unavailable.")?;
        serde_json::from_str(&response).map_err(|_| "Migration reader unavailable.".into())
    }
}

fn reader_script(report: &str) -> String {
    let script = include_str!("migration-reader.js")
        .trim()
        .trim_end_matches(';');
    format!("({script})({report});")
}
