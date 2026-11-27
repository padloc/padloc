import Foundation
import Tauri
import WebKit

private struct ReadStorageArgs: Decodable {
    let script: String
}

final class CordovaMigrationPlugin: Plugin {
    private var reader: LegacyStorageReader?

    @objc public func readStorage(_ invoke: Invoke) {
        DispatchQueue.main.async {
            guard self.reader == nil,
                  let args = try? invoke.parseArgs(ReadStorageArgs.self) else {
                invoke.reject("Migration reader unavailable.")
                return
            }

            let reader = LegacyStorageReader { [weak self] result in
                self?.reader = nil
                if let result = result {
                    invoke.resolve(result)
                } else {
                    invoke.reject("Migration reader unavailable.")
                }
            }
            self.reader = reader
            reader.start(script: args.script)
        }
    }
}

private final class LegacyStorageReader: NSObject, WKURLSchemeHandler, WKNavigationDelegate, WKScriptMessageHandler {
    private let url = URL(string: "ionic://localhost/padloc-migration")!
    private let messageName = "padlocMigration"
    private var completion: ((String?) -> Void)?
    private var webView: WKWebView?
    private var timeout: DispatchWorkItem?

    init(completion: @escaping (String?) -> Void) {
        self.completion = completion
    }

    func start(script: String) {
        let config = WKWebViewConfiguration()
        // Use Cordova's persistent store so WebKit can open its legacy origin.
        config.websiteDataStore = .default()
        config.setURLSchemeHandler(self, forURLScheme: "ionic")
        config.userContentController.add(self, name: messageName)
        config.userContentController.addUserScript(
            WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        )

        let view = WKWebView(frame: .zero, configuration: config)
        webView = view
        view.navigationDelegate = self
        let deadline = DispatchWorkItem { [weak self] in self?.finish(nil) }
        timeout = deadline
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: deadline)
        view.load(URLRequest(url: url))
    }

    private func finish(_ result: String?) {
        guard let complete = completion else { return }
        completion = nil
        timeout?.cancel()
        timeout = nil
        webView?.navigationDelegate = nil
        webView?.stopLoading()
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: messageName)
        webView = nil
        complete(result)
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard urlSchemeTask.request.url == url else {
            urlSchemeTask.didFailWithError(URLError(.unsupportedURL))
            finish(nil)
            return
        }

        let html = """
            <!doctype html>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'">
            <title>Local migration</title>
            """
        let data = Data(html.utf8)
        urlSchemeTask.didReceive(URLResponse(
            url: url, mimeType: "text/html", expectedContentLength: data.count, textEncodingName: "utf-8"
        ))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(navigationAction.request.url == url ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finish(nil)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        finish(nil)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        finish(nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let origin = message.frameInfo.securityOrigin
        guard message.frameInfo.isMainFrame, origin.protocol == "ionic", origin.host == "localhost",
              let body = message.body as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: body),
              data.count <= 48 * 1024 * 1024 else {
            finish(nil)
            return
        }
        finish(String(data: data, encoding: .utf8))
    }
}

@_cdecl("init_plugin_cordova_migration")
public func initPlugin() -> Plugin { CordovaMigrationPlugin() }
