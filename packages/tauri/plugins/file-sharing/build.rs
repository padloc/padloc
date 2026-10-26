fn main() {
    tauri_plugin::Builder::new(&["share_file"]).android_path("android").build();
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        println!("cargo:rerun-if-changed=native/share.m");
        cc::Build::new()
            .file("native/share.m")
            .flag("-fobjc-arc")
            .flag("-fblocks")
            .compile("padloc_file_sharing");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=UIKit");
    }
}
