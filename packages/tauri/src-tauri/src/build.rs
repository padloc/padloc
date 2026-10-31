fn main() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
    println!("cargo:rerun-if-changed=native/migration.m");
    println!("cargo:rerun-if-changed=native/migration-reader.js");
    let mut native = cc::Build::new();
    native.file("native/migration.m");
    if std::env::var_os("CARGO_FEATURE_MIGRATION_PROBE").is_some() {
      println!("cargo:rerun-if-changed=../test/migration/legacy-reader.m");
      native.file("../test/migration/legacy-reader.m");
    }
    native.flag("-fobjc-arc").flag("-fblocks").compile("padloc_migration");
  }
  tauri_build::build()
}
