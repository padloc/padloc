package app.padloc.plugins.biometric

import android.app.Activity
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.security.KeyStore
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@InvokeArg
class KeyArgs { var id: String = ""; var key: String = "" }

@TauriPlugin
class BiometricKeyStorePlugin(private val activity: Activity) : Plugin(activity) {
    private val io = Executors.newSingleThreadExecutor()
    private val root get() = File(activity.noBackupFilesDir, "PadlocBiometric")
    private val prefix = "app.padloc.tauri.biometric.v1."
    private class Request(val invoke: Invoke, val secret: ByteArray? = null) {
        var aliasToDelete: String? = null
        var prompt: BiometricPrompt? = null
    }
    private var pending: Request? = null // UI thread only
    private var destroyed = false

    private fun available() = activity is FragmentActivity && BiometricManager.from(activity)
        .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS

    @Command
    fun status(invoke: Invoke) {
        val supported = available()
        invoke.resolve(JSObject().put("available", supported).put("kind", if (supported) "biometric" else "none"))
    }

    private fun keyStore() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private fun record(id: String): AtomicFile {
        val hash = MessageDigest.getInstance("SHA-256").digest(id.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
        return AtomicFile(File(root, "$hash.json"))
    }
    private fun validId(id: String) = id.toByteArray(Charsets.UTF_8).size <= 128 && !id.contains('\u0000')
    private fun begin(invoke: Invoke, secret: ByteArray? = null): Request? {
        if (destroyed || pending != null) {
            secret?.fill(0)
            invoke.reject("Biometric authentication is already in progress.", "authentication_failed")
            return null
        }
        if (!available()) {
            secret?.fill(0)
            invoke.reject("Strong biometric authentication is not available.", "not_supported")
            return null
        }
        return Request(invoke, secret).also { pending = it }
    }
    private fun finish(request: Request, value: JSObject? = null, code: String? = null) {
        if (pending !== request) return
        pending = null
        request.secret?.fill(0)
        request.aliasToDelete?.let { alias -> io.execute { try { keyStore().deleteEntry(alias) } catch (_: Exception) {} } }
        if (code == null) request.invoke.resolve(value ?: JSObject()) else {
            val message = when (code) {
                "cancelled" -> "Biometric authentication was cancelled."
                "locked_out" -> "Biometrics are locked. Unlock your device and try again."
                "not_found" -> "Biometric unlock needs to be set up again."
                else -> "Unable to access the protected biometric key."
            }
            request.invoke.reject(message, code)
        }
    }
    private fun failure(request: Request, error: Exception) {
        val code = if (error is KeyPermanentlyInvalidatedException || error is FileNotFoundException)
            "not_found" else "keychain_error"
        activity.runOnUiThread { finish(request, code = code) }
    }
    private fun prompt(request: Request, cipher: Cipher, operation: (Cipher) -> JSObject) {
        activity.runOnUiThread {
            if (pending !== request) return@runOnUiThread
            val host = activity as FragmentActivity
            if (destroyed || !host.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
                finish(request, code = "cancelled")
                return@runOnUiThread
            }
            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val code = when (errorCode) {
                        BiometricPrompt.ERROR_USER_CANCELED, BiometricPrompt.ERROR_CANCELED,
                        BiometricPrompt.ERROR_NEGATIVE_BUTTON -> "cancelled"
                        BiometricPrompt.ERROR_LOCKOUT, BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "locked_out"
                        else -> "authentication_failed"
                    }
                    finish(request, code = code)
                }
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    if (pending !== request) return
                    request.prompt = null
                    io.execute {
                        try {
                            val authenticated = result.cryptoObject?.cipher ?: throw IllegalStateException()
                            val value = operation(authenticated)
                            activity.runOnUiThread {
                                if (host.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) finish(request, value)
                                else finish(request, code = "cancelled")
                            }
                        } catch (error: Exception) { failure(request, error) }
                    }
                }
            }
            val biometric = BiometricPrompt(host, ContextCompat.getMainExecutor(activity), callback)
            request.prompt = biometric
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(if (request.secret == null) "Biometric Unlock" else "Enable Biometric Unlock")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .setNegativeButtonText("Cancel").build()
            try { biometric.authenticate(info, BiometricPrompt.CryptoObject(cipher)) }
            catch (error: Exception) { failure(request, error) }
        }
    }

    @Command
    fun store(invoke: Invoke) {
        val args = invoke.parseArgs(KeyArgs::class.java)
        val secret = try {
            if (!validId(args.id) || args.key.length > 64 || !args.key.matches(Regex("[A-Za-z0-9+/]+={0,2}")))
                throw IllegalArgumentException()
            Base64.decode(args.key, Base64.NO_WRAP).also {
                if (it.size != 32) { it.fill(0); throw IllegalArgumentException() }
            }
        } catch (_: Exception) {
            invoke.reject("Invalid biometric key.", "invalid_request")
            return
        }
        val request = begin(invoke, secret) ?: return
        io.execute {
            try {
                if (!root.exists() && !root.mkdirs()) throw IllegalStateException()
                val file = record(args.id)
                val oldAlias = try { JSONObject(String(file.readFully(), Charsets.UTF_8)).getString("alias") }
                    catch (_: Exception) { null }
                val alias = prefix + UUID.randomUUID().toString()
                request.aliasToDelete = alias
                val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256).setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true)
                if (Build.VERSION.SDK_INT >= 30) spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
                else @Suppress("DEPRECATION") spec.setUserAuthenticationValidityDurationSeconds(-1)
                val key = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply { init(spec.build()) }.generateKey()
                val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key) }
                prompt(request, cipher) { authenticated ->
                    authenticated.updateAAD(args.id.toByteArray(Charsets.UTF_8))
                    val encrypted = authenticated.doFinal(secret)
                    val record = JSONObject().put("version", 1).put("alias", alias)
                        .put("iv", Base64.encodeToString(authenticated.iv, Base64.NO_WRAP))
                        .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP)).toString().toByteArray(Charsets.UTF_8)
                    val output = file.startWrite()
                    try { output.write(record); file.finishWrite(output) }
                    catch (error: Exception) { file.failWrite(output); throw error }
                    request.aliasToDelete = null
                    // Keep the old protected record/key until atomic replacement succeeds.
                    if (oldAlias != null && oldAlias.startsWith(prefix) && oldAlias != alias)
                        try { keyStore().deleteEntry(oldAlias) } catch (_: Exception) {}
                    JSObject().put("ok", true)
                }
            } catch (error: Exception) { failure(request, error) }
        }
    }

    @Command
    fun get(invoke: Invoke) {
        val args = invoke.parseArgs(KeyArgs::class.java)
        if (!validId(args.id)) { invoke.reject("Invalid biometric key identifier.", "invalid_request"); return }
        val request = begin(invoke) ?: return
        io.execute {
            try {
                val record = JSONObject(String(record(args.id).readFully(), Charsets.UTF_8))
                val alias = record.getString("alias")
                if (record.getInt("version") != 1 || !alias.startsWith(prefix)) throw IllegalStateException()
                val key = keyStore().getKey(alias, null) as? SecretKey ?: throw FileNotFoundException()
                val iv = Base64.decode(record.getString("iv"), Base64.NO_WRAP)
                val ciphertext = Base64.decode(record.getString("ciphertext"), Base64.NO_WRAP)
                if (iv.size != 12 || ciphertext.size != 48) throw IllegalStateException()
                val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv)) }
                prompt(request, cipher) { authenticated ->
                    authenticated.updateAAD(args.id.toByteArray(Charsets.UTF_8))
                    val secret = authenticated.doFinal(ciphertext)
                    try {
                        if (secret.size != 32) throw IllegalStateException()
                        JSObject().put("key", Base64.encodeToString(secret, Base64.NO_WRAP))
                    } finally { secret.fill(0) }
                }
            } catch (error: Exception) { failure(request, error) }
        }
    }

    override fun onStop(activity: AppCompatActivity) { pending?.prompt?.cancelAuthentication() }
    override fun onDestroy(activity: AppCompatActivity) {
        destroyed = true
        pending?.prompt?.cancelAuthentication()
        // Drain key creation/crypto work before deleting any tentative alias.
        // Keep the executor alive until finish has queued that final cleanup.
        io.execute {
            activity.runOnUiThread {
                pending?.let { finish(it, code = "cancelled") }
                io.shutdown()
            }
        }
    }
}
