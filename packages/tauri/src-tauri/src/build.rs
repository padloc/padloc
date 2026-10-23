fn main() {
  if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") &&
      std::env::var_os("CARGO_FEATURE_MIGRATION_PROBE").is_some() {
    println!("cargo:rerun-if-changed=../test/migration/legacy-reader.m");
    cc::Build::new().file("../test/migration/legacy-reader.m")
      .flag("-fobjc-arc").flag("-fblocks").compile("padloc_migration_probe");
  }
  tauri_build::build()
}
