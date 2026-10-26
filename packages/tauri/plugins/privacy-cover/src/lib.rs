use tauri::{plugin::{Builder, TauriPlugin}, Runtime};

#[cfg(target_os = "ios")]
#[path = "ios.rs"]
mod commands;
#[cfg(not(target_os = "ios"))]
#[path = "unsupported.rs"]
mod commands;

pub fn init<R: Runtime>(label: &str) -> TauriPlugin<R> {
    let label = label.to_owned();
    #[cfg(not(target_os = "ios"))]
    let _ = &label;
    Builder::new("privacy-cover")
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
