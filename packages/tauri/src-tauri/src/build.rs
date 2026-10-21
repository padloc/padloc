fn main() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
    println!("cargo:rerun-if-changed=native/privacy.m");
    cc::Build::new()
      .file("native/privacy.m")
      .flag("-fobjc-arc")
      .flag("-fblocks")
      .compile("padloc_privacy");
  }
  tauri_build::build()
}
