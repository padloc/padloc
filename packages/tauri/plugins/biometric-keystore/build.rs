fn main() {
    tauri_plugin::Builder::new(&["biometric_status", "biometric_store", "biometric_get"]).android_path("android").build();
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        println!("cargo:rerun-if-changed=ios/biometric.m");
        cc::Build::new()
            .file("ios/biometric.m")
            .flag("-fobjc-arc")
            .flag("-fblocks")
            .compile("padloc_biometric_keystore");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=LocalAuthentication");
        println!("cargo:rustc-link-lib=framework=Security");
    }
}
