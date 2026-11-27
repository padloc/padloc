// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-cordova-migration",
    platforms: [.iOS(.v13)],
    products: [.library(name: "tauri-plugin-cordova-migration", type: .static, targets: ["tauri-plugin-cordova-migration"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-cordova-migration", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
