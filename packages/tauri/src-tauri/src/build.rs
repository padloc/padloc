fn main() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
    println!("cargo:rerun-if-changed=native/migration.m");
    println!("cargo:rerun-if-changed=native/migration-reader.js");
    cc::Build::new()
      .file("native/migration.m")
      .flag("-fobjc-arc")
      .flag("-fblocks")
      .compile("padloc_migration");
  }
  tauri_build::build()
}
