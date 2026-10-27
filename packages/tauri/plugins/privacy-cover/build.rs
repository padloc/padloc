fn main() {
    tauri_plugin::Builder::new(&["background_state", "resume_complete"]).android_path("android").build();
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        println!("cargo:rerun-if-changed=ios/privacy.m");
        cc::Build::new()
            .file("ios/privacy.m")
            .flag("-fobjc-arc")
            .flag("-fblocks")
            .compile("padloc_privacy_cover");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=UIKit");
        println!("cargo:rustc-link-lib=framework=WebKit");
    }
}
