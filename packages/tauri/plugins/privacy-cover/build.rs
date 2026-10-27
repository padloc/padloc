fn main() {
    tauri_plugin::Builder::new(&["background_state", "resume_complete"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
