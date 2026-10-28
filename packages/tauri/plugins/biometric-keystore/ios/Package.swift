// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-biometric-keystore",
    platforms: [.iOS(.v13)],
    products: [.library(name: "tauri-plugin-biometric-keystore", type: .static, targets: ["tauri-plugin-biometric-keystore"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-biometric-keystore", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
