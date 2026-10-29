// Chromium performs WebAuthn in the popup. Firefox exposes the same controls,
// but moves the ceremony to a persistent window because its popup closes.
export function supportsExtensionBiometrics(
    target: string | undefined,
    firefoxVersion: string,
    firefoxId: string | undefined
) {
    return target === "chromium" || (target === "firefox" && !!firefoxId && Number.parseInt(firefoxVersion, 10) >= 150);
}
