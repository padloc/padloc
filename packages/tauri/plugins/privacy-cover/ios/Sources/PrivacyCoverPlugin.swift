import Tauri
import UIKit
import WebKit

private struct ResumeArgs: Decodable { let generation: UInt64 }
private struct BackgroundState: Encodable {
    let generation: UInt64
    let pausedAt: Double
    let inactive: Bool
}

final class PrivacyCoverPlugin: Plugin {
    private weak var webView: WKWebView?
    private var cover: UIView?
    private var generation: UInt64 = 0
    private var pausedAt: Double = 0
    private var inactive = false
    private var observers: [NSObjectProtocol] = []

    @objc public override func load(webview: WKWebView) {
        onMain {
            self.webView = webview
            guard self.observers.isEmpty else { return }
            let center = NotificationCenter.default
            for name in [UIApplication.willResignActiveNotification, UIApplication.didEnterBackgroundNotification,
                         UIScene.willDeactivateNotification, UIScene.didEnterBackgroundNotification] {
                self.observers.append(center.addObserver(forName: name, object: nil, queue: nil) { [weak self] note in
                    self?.onMain {
                        guard let self = self, self.isOwnScene(note) else { return }
                        self.conceal()
                    }
                })
            }
            for name in [UIApplication.didBecomeActiveNotification, UIScene.didActivateNotification] {
                self.observers.append(center.addObserver(forName: name, object: nil, queue: nil) { [weak self] note in
                    self?.onMain {
                        guard let self = self, self.isOwnScene(note) else { return }
                        self.inactive = false
                        self.webView?.evaluateJavaScript("window.dispatchEvent(new Event('padloc-native-resume'))", completionHandler: nil)
                    }
                })
            }
        }
    }

    private func onMain(_ block: () -> Void) {
        if Thread.isMainThread { block() } else { DispatchQueue.main.sync(execute: block) }
    }

    private func isOwnScene(_ notification: Notification) -> Bool {
        guard let scene = notification.object as? UIScene else { return true }
        return scene === webView?.window?.windowScene
    }

    private func conceal() {
        if !inactive {
            inactive = true
            generation += 1
            // Retain the oldest unacknowledged visit, including rapid re-backgrounds.
            if pausedAt == 0 { pausedAt = Date().timeIntervalSince1970 * 1000 }
        }
        guard let window = webView?.window else { return }
        if cover == nil {
            let view = UIView(frame: window.bounds)
            view.backgroundColor = .systemBackground
            view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            view.accessibilityIdentifier = "padloc-privacy-cover"
            view.accessibilityLabel = "Padloc privacy screen"
            view.isAccessibilityElement = true
            view.accessibilityViewIsModal = true
            cover = view
        }
        window.addSubview(cover!)
        window.bringSubviewToFront(cover!)
        window.layoutIfNeeded()
    }

    @objc public func backgroundState(_ invoke: Invoke) {
        onMain { invoke.resolve(BackgroundState(generation: generation, pausedAt: pausedAt, inactive: inactive)) }
    }

    @objc public func resumeComplete(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(ResumeArgs.self)
        onMain {
            if !inactive && generation == args.generation {
                cover?.removeFromSuperview()
                cover = nil
                pausedAt = 0
            }
            invoke.resolve([String: String]())
        }
    }

    deinit {
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }
}

@_cdecl("init_plugin_privacy_cover")
public func initPlugin() -> Plugin { PrivacyCoverPlugin() }
