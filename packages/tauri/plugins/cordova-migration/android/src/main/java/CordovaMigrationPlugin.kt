package app.padloc.plugins.migration

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@InvokeArg
class ReadStorageArgs {
    lateinit var script: String
    var https: Boolean = false
}

@TauriPlugin
class CordovaMigrationPlugin(private val activity: Activity) : Plugin(activity) {
    private val handler = Handler(Looper.getMainLooper())
    private var reader: WebView? = null

    // Intercept only this document. Keep the default WebView profile so the
    // original Cordova origin has access to its own IndexedDB data.

    @Command
    fun readStorage(invoke: Invoke) {
        val args = invoke.parseArgs(ReadStorageArgs::class.java)
        val url = if (args.https) "https://localhost/padloc-migration" else "http://localhost/padloc-migration"
        activity.runOnUiThread {
            if (reader != null) {
                invoke.reject("Migration reader already running.")
                return@runOnUiThread
            }

            val view = try {
                WebView(activity)
            } catch (error: RuntimeException) {
                invoke.reject("Migration reader unavailable.")
                return@runOnUiThread
            }
            reader = view
            val timeout = Runnable { finish(view, invoke, null) }

            fun complete(result: String?) {
                handler.removeCallbacks(timeout)
                finish(view, invoke, result)
            }

            fun poll() {
                if (reader !== view) return
                view.evaluateJavascript("window.padlocMigrationResult || null") { result ->
                    if (reader !== view) return@evaluateJavascript
                    if (result == null || result == "null") {
                        handler.postDelayed({ poll() }, 100)
                    } else {
                        complete(result.takeIf { it.length <= 48 * 1024 * 1024 })
                    }
                }
            }

            try {
                view.settings.javaScriptEnabled = true
                view.settings.domStorageEnabled = true
                view.settings.allowFileAccess = false
                view.settings.allowContentAccess = false
                view.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(page: WebView, request: WebResourceRequest): Boolean = true

                    override fun shouldInterceptRequest(page: WebView, request: WebResourceRequest): WebResourceResponse {
                        if (!request.isForMainFrame || request.url.toString() != url || request.method != "GET") {
                            return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), byteArrayOf().inputStream())
                        }
                        return WebResourceResponse(
                            "text/html",
                            "UTF-8",
                            200,
                            "OK",
                            mapOf("Content-Security-Policy" to "default-src 'none'"),
                            "<!doctype html><title>Local migration</title>".byteInputStream()
                        )
                    }

                    override fun onPageFinished(page: WebView, loadedUrl: String) {
                        if (reader !== view || loadedUrl != url) return
                        page.evaluateJavascript(args.script) { poll() }
                    }

                    override fun onReceivedError(page: WebView, request: WebResourceRequest, error: WebResourceError) {
                        if (request.isForMainFrame) complete(null)
                    }

                    override fun onRenderProcessGone(page: WebView, detail: RenderProcessGoneDetail): Boolean {
                        complete(null)
                        return true
                    }
                }
                handler.postDelayed(timeout, 15_000)
                view.loadUrl(url)
            } catch (error: RuntimeException) {
                complete(null)
            }
        }
    }

    private fun finish(view: WebView, invoke: Invoke, result: String?) {
        if (reader !== view) return
        reader = null
        view.destroy()
        if (result == null) invoke.reject("Migration reader unavailable.") else invoke.resolveObject(result)
    }
}
