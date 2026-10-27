package app.padloc.plugins.sharing

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Base64
import android.webkit.MimeTypeMap
import android.webkit.WebView
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private const val MAX_BYTES = 64 * 1024 * 1024
private const val RETENTION_MS = 10 * 60 * 1000L
private fun validName(name: String) = name.isNotEmpty() && name != "." && name != ".." &&
    name.toByteArray(Charsets.UTF_8).size <= 240 && name.none { it == '/' || it == '\\' || it.code < 32 || it.code == 127 }

// A separate, read-only provider exposes only this plugin's temporary exports.
// Wall-clock expiry also applies when the app was suspended or killed before cleanup.
class PadlocShareProvider : FileProvider() {
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        val segments = uri.pathSegments
        if (mode != "r" || segments.size != 3 || segments[0] != "exports" ||
            !segments[1].matches(Regex("[0-9a-f-]{36}")) || !validName(segments[2])) throw FileNotFoundException()
        val file = File(File(context!!.cacheDir, "PadlocShare/${segments[1]}"), segments[2])
        val age = System.currentTimeMillis() - file.lastModified()
        if (age < 0 || age >= RETENTION_MS || !file.isFile) throw FileNotFoundException()
        return super.openFile(uri, mode)
    }
}

@InvokeArg
class ShareArgs { var name: String = ""; var data: String = "" }

@TauriPlugin
class FileSharingPlugin(private val activity: Activity) : Plugin(activity) {
    private val io = Executors.newSingleThreadScheduledExecutor()
    private val root get() = File(activity.cacheDir, "PadlocShare")
    private var active = false // UI thread only

    override fun load(webView: WebView) {
        // Kept after chooser return for asynchronous receivers; remove leftovers
        // on a fresh process/WebView load, just as the iOS plugin does.
        io.execute { root.deleteRecursively() }
    }

    @Command
    fun share(invoke: Invoke) {
        if (active) { invoke.reject("A share request is already in progress."); return }
        active = true
        io.execute {
            var directory: File? = null
            try {
                val args = invoke.parseArgs(ShareArgs::class.java)
                if (!validName(args.name) || args.data.length > 90 * 1024 * 1024 ||
                    !args.data.matches(Regex("[A-Za-z0-9+/]*={0,2}"))) throw IllegalArgumentException()
                val data = Base64.decode(args.data, Base64.NO_WRAP)
                if (data.size > MAX_BYTES) throw IllegalArgumentException()
                // Bound accumulated cache usage without removing still-valid grants.
                val now = System.currentTimeMillis()
                root.listFiles()?.forEach { dir ->
                    if (dir.listFiles()?.all { now - it.lastModified() >= RETENTION_MS } != false) dir.deleteRecursively()
                }
                val cached = root.walkTopDown().filter { it.isFile }.sumOf { it.length() }
                if (cached + data.size > 2L * MAX_BYTES) throw IllegalStateException()
                directory = File(root, UUID.randomUUID().toString())
                if (!directory.mkdirs()) throw IllegalStateException()
                val file = File(directory, args.name)
                try { file.outputStream().use { it.write(data) } } finally { data.fill(0) }
                val uri = FileProvider.getUriForFile(activity, activity.packageName + ".padloc.share", file)
                val type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(file.extension.lowercase()) ?: "application/octet-stream"
                val send = Intent(Intent.ACTION_SEND).setType(type).putExtra(Intent.EXTRA_STREAM, uri)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                send.clipData = ClipData.newUri(activity.contentResolver, "Export", uri)
                val chooser = Intent.createChooser(send, "Share file").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                val staged = directory
                io.schedule({
                    activity.revokeUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    staged.deleteRecursively()
                }, RETENTION_MS, TimeUnit.MILLISECONDS)
                activity.runOnUiThread {
                    try { startActivityForResult(invoke, chooser, "shareResult") }
                    catch (_: Exception) {
                        active = false
                        io.execute { staged.deleteRecursively() }
                        invoke.reject("Unable to open file sharing.")
                    }
                }
            } catch (_: Exception) {
                directory?.deleteRecursively()
                activity.runOnUiThread { active = false; invoke.reject("Invalid file sharing request or unavailable temporary storage.") }
            }
        }
    }

    @ActivityCallback
    private fun shareResult(invoke: Invoke, result: ActivityResult) {
        active = false
        // Android chooser results do not establish delivery or distinguish every
        // cancellation path. Never report successful delivery based on RESULT_OK.
        invoke.resolve(JSObject().put("completed", JSONObject.NULL))
    }
}
