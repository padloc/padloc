// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-privacy-cover",
    platforms: [.iOS(.v13)],
    products: [.library(name: "tauri-plugin-privacy-cover", type: .static, targets: ["tauri-plugin-privacy-cover"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-privacy-cover", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
