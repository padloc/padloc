fn main() {
    tauri_plugin::Builder::new(&["biometric_status", "biometric_store", "biometric_get"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
