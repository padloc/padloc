#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>
#import <Security/Security.h>

// Called on a Rust blocking worker, never the UIKit main thread. Secrets are
// protected by Keychain ACLs; a successful UI prompt alone cannot release them.
static NSString *const service = @"app.padloc.tauri.biometric.v1";

static char *result(NSDictionary *value) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
    return strdup([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
}

static char *failure(NSString *code, NSString *message) {
    return result(@{@"error": @{@"code": code, @"message": message}});
}

static char *authFailure(NSError *error) {
    if ([error.domain isEqualToString:LAErrorDomain]) {
        switch (error.code) {
            case LAErrorUserCancel:
            case LAErrorAppCancel:
            case LAErrorSystemCancel:
                return failure(@"cancelled", @"Biometric authentication was cancelled.");
            case LAErrorBiometryLockout:
                return failure(@"locked_out", @"Biometrics are locked. Unlock your device and try again.");
            case LAErrorBiometryNotAvailable:
            case LAErrorBiometryNotEnrolled:
            case LAErrorPasscodeNotSet:
                return failure(@"not_supported", @"Biometric authentication is not available on this device.");
            default: break;
        }
    }
    return failure(@"authentication_failed", @"Biometric authentication failed.");
}

static char *keychainFailure(OSStatus status) {
    NSLog(@"Padloc biometric Keychain operation failed: %d", (int)status);
    if (status == errSecItemNotFound)
        return failure(@"not_found", @"Biometric unlock needs to be set up again.");
    if (status == errSecUserCanceled)
        return failure(@"cancelled", @"Biometric authentication was cancelled.");
    if (status == errSecAuthFailed)
        return failure(@"authentication_failed", @"Biometric authentication failed.");
    return failure(@"keychain_error", @"Unable to access the protected biometric key.");
}

static LAContext *context(void) {
    LAContext *ctx = [[LAContext alloc] init];
    ctx.localizedFallbackTitle = @"";
    ctx.touchIDAuthenticationAllowableReuseDuration = 0;
    return ctx;
}

static char *authenticate(LAContext *ctx, NSString *reason) {
    NSError *error = nil;
    if (![ctx canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error])
        return authFailure(error);
    dispatch_semaphore_t finished = dispatch_semaphore_create(0);
    __block BOOL authenticated = NO;
    __block NSError *authError = nil;
    [ctx evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
         localizedReason:reason reply:^(BOOL success, NSError *err) {
             authenticated = success;
             authError = err;
             dispatch_semaphore_signal(finished);
         }];
    dispatch_semaphore_wait(finished, DISPATCH_TIME_FOREVER);
    if (!authenticated) {
        [ctx invalidate];
        return authFailure(authError);
    }
    return NULL;
}

static NSMutableDictionary *query(NSString *identifier) {
    return [@{(__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
              (__bridge id)kSecAttrService: service,
              (__bridge id)kSecAttrAccount: identifier,
              (__bridge id)kSecAttrSynchronizable: @NO} mutableCopy];
}

char *padloc_biometric_status(void) {
    @autoreleasepool {
        LAContext *ctx = context();
        NSError *error = nil;
        BOOL available = [ctx canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];
        NSString *kind = ctx.biometryType == LABiometryTypeFaceID ? @"faceID" :
                         ctx.biometryType == LABiometryTypeTouchID ? @"touchID" : @"none";
        return result(@{@"available": @(available), @"kind": kind});
    }
}

char *padloc_biometric_store(const char *rawIdentifier, const char *rawSecret) {
    @autoreleasepool {
        NSString *identifier = [NSString stringWithUTF8String:rawIdentifier];
        NSData *secret = [[NSData alloc] initWithBase64EncodedString:
            [NSString stringWithUTF8String:rawSecret] options:0];
        if (!identifier || identifier.length > 128 || secret.length != 32)
            return failure(@"invalid_request", @"Invalid biometric key.");

        LAContext *ctx = context();
        NSError *error = nil;
        if (![ctx canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error])
            return authFailure(error);
        dispatch_semaphore_t finished = dispatch_semaphore_create(0);
        __block BOOL authenticated = NO;
        __block NSError *authError = nil;
        [ctx evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
             localizedReason:@"Enable Biometric Unlock"
             reply:^(BOOL success, NSError *err) {
                 authenticated = success;
                 authError = err;
                 dispatch_semaphore_signal(finished);
             }];
        dispatch_semaphore_wait(finished, DISPATCH_TIME_FOREVER);
        if (!authenticated) return authFailure(authError);

        CFErrorRef aclError = NULL;
        SecAccessControlRef access = SecAccessControlCreateWithFlags(NULL,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecAccessControlBiometryCurrentSet, &aclError);
        if (!access) {
            if (aclError) CFRelease(aclError);
            return failure(@"keychain_error", @"Unable to protect the biometric key.");
        }
        NSMutableDictionary *item = query(identifier);
        // Only replace an earlier key after the user successfully authenticates.
        OSStatus status = SecItemDelete((__bridge CFDictionaryRef)item);
        if (status != errSecSuccess && status != errSecItemNotFound) {
            CFRelease(access);
            return keychainFailure(status);
        }
        item[(__bridge id)kSecAttrAccessControl] = (__bridge id)access;
        item[(__bridge id)kSecValueData] = secret;
        status = SecItemAdd((__bridge CFDictionaryRef)item, NULL);
        CFRelease(access);
        [ctx invalidate];
        return status == errSecSuccess ? result(@{@"ok": @YES}) : keychainFailure(status);
    }
}

char *padloc_biometric_get(const char *rawIdentifier) {
    @autoreleasepool {
        NSString *identifier = [NSString stringWithUTF8String:rawIdentifier];
        if (!identifier || identifier.length > 128)
            return failure(@"invalid_request", @"Invalid biometric key identifier.");
        LAContext *ctx = context();
        char *authError = authenticate(ctx, @"Biometric Unlock");
        if (authError) return authError;
        ctx.localizedReason = @"Biometric Unlock";
        NSMutableDictionary *item = query(identifier);
        item[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
        item[(__bridge id)kSecReturnData] = @YES;
        item[(__bridge id)kSecUseAuthenticationContext] = ctx;
        CFTypeRef value = NULL;
        OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)item, &value);
        [ctx invalidate];
        if (status != errSecSuccess) return keychainFailure(status);
        NSData *secret = CFBridgingRelease(value);
        if (![secret isKindOfClass:NSData.class] || secret.length != 32)
            return failure(@"keychain_error", @"Invalid protected biometric key.");
        return result(@{@"key": [secret base64EncodedStringWithOptions:0]});
    }
}

void padloc_biometric_free(char *value) { free(value); }
