fn main() {
    tauri_plugin::Builder::new(&["share_file"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
