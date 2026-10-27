use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "ios")]
#[path = "ios.rs"]
mod commands;
#[cfg(target_os = "android")]
#[path = "android.rs"]
mod commands;
#[cfg(not(any(target_os = "ios", target_os = "android")))]
#[path = "unsupported.rs"]
mod commands;

pub fn init<R: Runtime>(label: &str) -> TauriPlugin<R> {
    let label = label.to_owned();
    #[cfg(not(target_os = "ios"))]
    let _ = &label;
    Builder::new("privacy-cover")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                app.manage(commands::AndroidPlugin(api.register_android_plugin("app.padloc.plugins.privacy", "PrivacyCoverPlugin")?));
            }
            #[cfg(not(target_os = "android"))]
            let _ = (app, api);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::background_state, commands::resume_complete])
        .on_webview_ready(move |webview| {
            #[cfg(not(target_os = "ios"))]
            let _ = &webview;
            #[cfg(target_os = "ios")]
            if webview.label() == label {
                webview.with_webview(|view| commands::install(view.inner()))
                    .expect("Unable to install native privacy cover");
            }
        })
        .build()
}
