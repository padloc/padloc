package app.padloc.plugins.privacy

import android.app.Activity
import android.graphics.Color
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class ResumeArgs { var generation: Long = -1 }

@TauriPlugin
class PrivacyCoverPlugin(private val activity: Activity) : Plugin(activity) {
    private var webView: WebView? = null
    private var cover: FrameLayout? = null
    private var generation = 0L
    private var pausedElapsed: Long? = null
    private var inactive = false
    private var accessibility = View.IMPORTANT_FOR_ACCESSIBILITY_AUTO

    override fun load(webView: WebView) {
        this.webView = webView
        // Match Cordova's Android protection: block screenshots/casting even
        // before onPause, when a recents snapshot might already be requested.
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        if (pausedElapsed != null) conceal()
    }

    private fun conceal() {
        if (cover != null) return
        webView?.let {
            accessibility = it.importantForAccessibility
            it.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        }
        val parent = activity.findViewById<ViewGroup>(android.R.id.content)
        cover = FrameLayout(activity).apply {
            setBackgroundColor(Color.BLACK)
            contentDescription = "Padloc privacy screen"
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
            isClickable = true
            isFocusable = true
            elevation = 1000f
        }
        parent.addView(cover, ViewGroup.LayoutParams(-1, -1))
        cover?.requestFocus()
    }

    override fun onPause(activity: AppCompatActivity) {
        if (!inactive) {
            generation++
            // Keep the oldest unacknowledged pause across rapid re-backgrounds.
            if (pausedElapsed == null) pausedElapsed = SystemClock.elapsedRealtime()
        }
        inactive = true
        conceal()
    }

    override fun onResume(activity: AppCompatActivity) {
        inactive = false
        webView?.evaluateJavascript("window.dispatchEvent(new Event('padloc-native-resume'))", null)
    }

    @Command
    fun backgroundState(invoke: Invoke) {
        val elapsed = pausedElapsed
        // Express a monotonic duration as an epoch timestamp for the shared API.
        val timestamp = if (elapsed == null) 0L else
            System.currentTimeMillis() - (SystemClock.elapsedRealtime() - elapsed)
        invoke.resolve(JSObject().put("generation", generation).put("pausedAt", timestamp).put("inactive", inactive))
    }

    @Command
    fun resumeComplete(invoke: Invoke) {
        val expected = invoke.parseArgs(ResumeArgs::class.java).generation
        if (!inactive && expected == generation) {
            cover?.let { (it.parent as? ViewGroup)?.removeView(it) }
            cover = null
            webView?.importantForAccessibility = accessibility
            pausedElapsed = null
        }
        invoke.resolve(JSObject())
    }

    override fun onDestroy(activity: AppCompatActivity) {
        webView = null
        cover = null
    }
}
