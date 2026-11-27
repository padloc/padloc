fn main() {
    tauri_plugin::Builder::new(&["read_cordova_storage"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
