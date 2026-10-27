// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-file-sharing",
    platforms: [.iOS(.v13)],
    products: [.library(name: "tauri-plugin-file-sharing", type: .static, targets: ["tauri-plugin-file-sharing"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-file-sharing", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
