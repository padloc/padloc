use std::ffi::c_void;

extern "C" {
    fn padloc_install_privacy(webview: *mut c_void);
    fn padloc_background_state(generation: *mut u64, paused_at: *mut f64, inactive: *mut bool);
    fn padloc_resume_complete(generation: u64);
}

pub fn install(webview: *mut c_void) {
    unsafe { padloc_install_privacy(webview) }
}

#[tauri::command]
pub fn background_state() -> serde_json::Value {
    let (mut generation, mut paused_at, mut inactive) = (0, 0.0, false);
    unsafe { padloc_background_state(&mut generation, &mut paused_at, &mut inactive) };
    serde_json::json!({ "generation": generation, "pausedAt": paused_at, "inactive": inactive })
}

#[tauri::command]
pub fn resume_complete(generation: u64) {
    unsafe { padloc_resume_complete(generation) }
}
