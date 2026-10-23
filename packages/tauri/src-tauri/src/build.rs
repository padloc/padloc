fn main() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
    println!("cargo:rerun-if-changed=native/privacy.m");
    println!("cargo:rerun-if-changed=native/biometric.m");
    println!("cargo:rerun-if-changed=native/share.m");
    cc::Build::new()
      .file("native/privacy.m")
      .file("native/biometric.m")
      .file("native/share.m")
      .flag("-fobjc-arc")
      .flag("-fblocks")
      .compile("padloc_privacy");
    println!("cargo:rustc-link-lib=framework=LocalAuthentication");
  }
  tauri_build::build()
}
