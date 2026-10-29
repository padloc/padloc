import SafariServices
import LocalAuthentication
import Security

// Runs inside the Safari extension, independently of the containing application.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              message["version"] as? Int == 1,
              let operation = message["operation"] as? String else {
            finish(context, ["ok": false, "error": "Invalid native request."])
            return
        }
        var profile = "default"
        if #available(macOS 14.0, *), let value = item.userInfo?[SFExtensionProfileKey] as? UUID {
            profile = value.uuidString
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let auth = LAContext()
            auth.localizedFallbackTitle = ""
            auth.localizedReason = "Unlock Padloc"
            var error: NSError?
            if operation == "status" {
                self.finish(context, ["ok": true, "supported": auth.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)])
                return
            }
            guard let id = message["id"] as? String,
                  id.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
                self.finish(context, ["ok": false, "error": "Invalid key identifier."])
                return
            }
            let service = (Bundle.main.bundleIdentifier ?? "app.padloc.safari.Extension") + ".biometrics"
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: profile + ":" + id,
                kSecUseDataProtectionKeychain as String: true
            ]
            var status: OSStatus = errSecParam
            var response: [String: Any] = [:]
            switch operation {
            case "store":
                guard let encoded = message["key"] as? String,
                      let data = Data(base64Encoded: encoded), data.count == 32 else {
                    self.finish(context, ["ok": false, "error": "Invalid biometric key encoding."])
                    return
                }
                guard auth.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                    self.finish(context, ["ok": false, "error": "Touch ID is unavailable (\(error?.code ?? 0))."])
                    return
                }
                var accessError: Unmanaged<CFError>?
                guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                                                                   .biometryCurrentSet, &accessError) else {
                    let code = accessError.map { CFErrorGetCode($0.takeRetainedValue()) } ?? 0
                    self.finish(context, ["ok": false, "error": "Cannot protect biometric key (\(code))."])
                    return
                }
                // Enrollment must prove biometric presence as well as protecting future reads.
                let semaphore = DispatchSemaphore(value: 0)
                var authenticated = false
                auth.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Enable Padloc Biometric Unlock") { success, _ in
                    authenticated = success
                    semaphore.signal()
                }
                semaphore.wait()
                guard authenticated else {
                    self.finish(context, ["ok": false, "error": "Biometric authentication canceled or failed."])
                    return
                }
                var attributes = query
                attributes[kSecAttrAccessControl as String] = access
                attributes[kSecValueData as String] = data
                status = SecItemAdd(attributes as CFDictionary, nil)
            case "get":
                var attributes = query
                attributes[kSecReturnData as String] = true
                attributes[kSecMatchLimit as String] = kSecMatchLimitOne
                attributes[kSecUseAuthenticationContext as String] = auth
                var result: CFTypeRef?
                status = SecItemCopyMatching(attributes as CFDictionary, &result)
                if status == errSecSuccess, let data = result as? Data { response["key"] = data.base64EncodedString() }
            case "remove":
                status = SecItemDelete(query as CFDictionary)
                if status == errSecItemNotFound { status = errSecSuccess }
            default: break
            }
            auth.invalidate()
            response["ok"] = status == errSecSuccess
            if status != errSecSuccess { response["error"] = "Biometric Keychain operation failed (\(status))." }
            self.finish(context, response)
        }
    }

    private func finish(_ context: NSExtensionContext, _ response: [String: Any]) {
        let item = NSExtensionItem()
        item.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }
}
