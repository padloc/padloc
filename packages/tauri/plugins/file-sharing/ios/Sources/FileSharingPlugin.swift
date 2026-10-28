import Foundation
import Tauri
import UIKit
import WebKit

private struct ShareArgs: Decodable { let name: String; let data: String }
private struct ShareResult: Encodable { let completed: Bool }

final class FileSharingPlugin: Plugin {
    private let worker = DispatchQueue(label: "app.padloc.file-sharing")
    private var active = false // Main thread only.
    private var shareWindow: UIWindow?
    private var root: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("PadlocShare", isDirectory: true)
    }

    @objc public override func load(webview: WKWebView) {
        worker.async { try? FileManager.default.removeItem(at: self.root) }
    }

    @objc public func share(_ invoke: Invoke) {
        DispatchQueue.main.async {
            guard !self.active else { invoke.reject("A share request is already in progress."); return }
            self.active = true
            self.worker.async {
                do {
                    let args = try invoke.parseArgs(ShareArgs.self)
                    guard !args.name.isEmpty, args.name.utf8.count <= 240,
                          args.name != ".", args.name != "..",
                          !args.name.contains("/"), !args.name.contains("\\"),
                          !args.name.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
                          args.data.utf8.count <= 90 * 1024 * 1024,
                          let bytes = Data(base64Encoded: args.data), bytes.count <= 64 * 1024 * 1024 else {
                        throw CocoaError(.fileWriteInvalidFileName)
                    }
                    let manager = FileManager.default
                    if manager.fileExists(atPath: self.root.path) { try manager.removeItem(at: self.root) }
                    try manager.createDirectory(at: self.root, withIntermediateDirectories: true,
                                                attributes: [.protectionKey: FileProtectionType.complete])
                    var root = self.root
                    var values = URLResourceValues()
                    values.isExcludedFromBackup = true
                    try root.setResourceValues(values)
                    let file = root.appendingPathComponent(args.name)
                    try bytes.write(to: file, options: [.atomic, .completeFileProtection])
                    DispatchQueue.main.async { self.present(file, invoke: invoke) }
                } catch { self.finish(invoke, completed: false, failed: true) }
            }
        }
    }

    private func present(_ file: URL, invoke: Invoke) {
        let windows = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .filter { $0.activationState == .foregroundActive }.flatMap { $0.windows }
        guard let original = windows.first(where: { $0.isKeyWindow }), let scene = original.windowScene else {
            finish(invoke, completed: false, failed: true)
            return
        }
        // A scene-initialized window is required for correctly sized remote
        // sharing UI; Tao's original window was created before attaching its scene.
        let window = UIWindow(windowScene: scene)
        window.windowLevel = original.windowLevel + 1
        window.backgroundColor = .clear
        let presenter = UIViewController()
        presenter.view.backgroundColor = .clear
        window.rootViewController = presenter
        shareWindow = window
        window.makeKeyAndVisible()
        window.layoutIfNeeded()
        let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        sheet.completionWithItemsHandler = { [weak self] _, completed, _, error in
            guard let self = self else { return }
            window.isHidden = true
            window.rootViewController = nil
            self.shareWindow = nil
            if scene.activationState == .foregroundActive { original.makeKey() }
            self.finish(invoke, completed: completed, failed: error != nil)
        }
        presenter.present(sheet, animated: true)
    }

    private func finish(_ invoke: Invoke, completed: Bool, failed: Bool) {
        worker.async {
            var failed = failed
            do {
                if FileManager.default.fileExists(atPath: self.root.path) {
                    try FileManager.default.removeItem(at: self.root)
                }
            } catch { failed = true }
            let resultFailed = failed
            DispatchQueue.main.async {
                self.active = false
                if resultFailed { invoke.reject("Unable to share the file. Please try again.") }
                else { invoke.resolve(ShareResult(completed: completed)) }
            }
        }
    }
}

@_cdecl("init_plugin_file_sharing")
public func initPlugin() -> Plugin { FileSharingPlugin() }
