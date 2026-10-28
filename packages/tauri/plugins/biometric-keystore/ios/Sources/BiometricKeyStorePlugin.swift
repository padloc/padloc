import Foundation
import LocalAuthentication
import Security
import Tauri

private struct KeyArgs: Decodable { let id: String; let key: String? }
private struct Status: Encodable { let available: Bool; let kind: String }
private struct Stored: Encodable { let ok: Bool }
private struct Retrieved: Encodable { let key: String }
private struct BiometricFailure: Error { let code: String; let message: String }

final class BiometricKeyStorePlugin: Plugin {
    // Preserve the service and ACLs so previously enrolled keys remain readable.
    private let service = "app.padloc.tauri.biometric.v1"
    private let worker = DispatchQueue(label: "app.padloc.biometric-keystore")

    private func context() -> LAContext {
        let context = LAContext()
        context.localizedFallbackTitle = ""
        context.touchIDAuthenticationAllowableReuseDuration = 0
        return context
    }

    private func authFailure(_ error: Error?) -> BiometricFailure {
        if let error = error as NSError?, error.domain == LAError.errorDomain {
            switch error.code {
            case LAError.userCancel.rawValue, LAError.appCancel.rawValue, LAError.systemCancel.rawValue:
                return BiometricFailure(code: "cancelled", message: "Biometric authentication was cancelled.")
            case LAError.biometryLockout.rawValue:
                return BiometricFailure(code: "locked_out", message: "Biometrics are locked. Unlock your device and try again.")
            case LAError.biometryNotAvailable.rawValue, LAError.biometryNotEnrolled.rawValue, LAError.passcodeNotSet.rawValue:
                return BiometricFailure(code: "not_supported", message: "Biometric authentication is not available on this device.")
            default: break
            }
        }
        return BiometricFailure(code: "authentication_failed", message: "Biometric authentication failed.")
    }

    private func keychainFailure(_ status: OSStatus) -> BiometricFailure {
        switch status {
        case errSecItemNotFound:
            return BiometricFailure(code: "not_found", message: "Biometric unlock needs to be set up again.")
        case errSecUserCanceled:
            return BiometricFailure(code: "cancelled", message: "Biometric authentication was cancelled.")
        case errSecAuthFailed:
            return BiometricFailure(code: "authentication_failed", message: "Biometric authentication failed.")
        default:
            return BiometricFailure(code: "keychain_error", message: "Unable to access the protected biometric key.")
        }
    }

    // Only used on the serial worker. Never block UIKit while waiting for LA.
    private func authenticate(_ context: LAContext, reason: String) throws {
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            throw authFailure(error)
        }
        let finished = DispatchSemaphore(value: 0)
        var success = false
        var failure: Error?
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { accepted, error in
            success = accepted
            failure = error
            finished.signal()
        }
        finished.wait()
        if !success { throw authFailure(failure) }
    }

    private func query(_ id: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: id,
         kSecAttrSynchronizable as String: false]
    }

    private func valid(_ id: String) -> Bool { id.utf8.count <= 128 && !id.contains("\0") }
    private func invalid() -> BiometricFailure { BiometricFailure(code: "invalid_request", message: "Invalid biometric key request.") }
    private func perform(_ invoke: Invoke, _ operation: @escaping () throws -> Void) {
        worker.async {
            do { try operation() }
            catch let error as BiometricFailure { invoke.reject(error.message, code: error.code) }
            catch { invoke.reject("Unable to access the protected biometric key.", code: "keychain_error") }
        }
    }

    @objc public func status(_ invoke: Invoke) {
        worker.async {
            let context = self.context()
            defer { context.invalidate() }
            var error: NSError?
            let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
            let kind = context.biometryType == .faceID ? "faceID" : context.biometryType == .touchID ? "touchID" : "none"
            invoke.resolve(Status(available: available, kind: kind))
        }
    }

    @objc public func store(_ invoke: Invoke) {
        perform(invoke) {
            let args: KeyArgs
            do { args = try invoke.parseArgs(KeyArgs.self) } catch { throw self.invalid() }
            guard self.valid(args.id), let encoded = args.key, encoded.count <= 64,
                  let secret = Data(base64Encoded: encoded), secret.count == 32 else { throw self.invalid() }
            let context = self.context()
            defer { context.invalidate() }
            try self.authenticate(context, reason: "Enable Biometric Unlock")
            var error: Unmanaged<CFError>?
            guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                                                               .biometryCurrentSet, &error) else {
                if let error = error { _ = error.takeRetainedValue() }
                throw self.keychainFailure(errSecParam)
            }
            var item = self.query(args.id)
            // As before, never remove an existing key before authentication succeeds.
            let deleted = SecItemDelete(item as CFDictionary)
            guard deleted == errSecSuccess || deleted == errSecItemNotFound else { throw self.keychainFailure(deleted) }
            item[kSecAttrAccessControl as String] = access
            item[kSecValueData as String] = secret
            let status = SecItemAdd(item as CFDictionary, nil)
            guard status == errSecSuccess else { throw self.keychainFailure(status) }
            invoke.resolve(Stored(ok: true))
        }
    }

    @objc public func get(_ invoke: Invoke) {
        perform(invoke) {
            let args: KeyArgs
            do { args = try invoke.parseArgs(KeyArgs.self) } catch { throw self.invalid() }
            guard self.valid(args.id) else { throw self.invalid() }
            let context = self.context()
            defer { context.invalidate() }
            try self.authenticate(context, reason: "Biometric Unlock")
            context.localizedReason = "Biometric Unlock"
            var item = self.query(args.id)
            item[kSecMatchLimit as String] = kSecMatchLimitOne
            item[kSecReturnData as String] = true
            item[kSecUseAuthenticationContext as String] = context
            var value: CFTypeRef?
            // The Keychain ACL, not just the successful prompt, gates release.
            let status = SecItemCopyMatching(item as CFDictionary, &value)
            guard status == errSecSuccess else { throw self.keychainFailure(status) }
            guard let secret = value as? Data, secret.count == 32 else { throw self.keychainFailure(errSecDecode) }
            invoke.resolve(Retrieved(key: secret.base64EncodedString()))
        }
    }
}

@_cdecl("init_plugin_biometric_keystore")
public func initPlugin() -> Plugin { BiometricKeyStorePlugin() }
