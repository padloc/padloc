import { getBackgroundState, completeResume, onResume } from "../plugins/privacy-cover/guest-js";
import { getStatus, storeKey, getKey } from "../plugins/biometric-keystore/guest-js";
import { shareFile } from "../plugins/file-sharing/guest-js";

const status = document.getElementById("status")!;
let resumes = 0;
async function resume() {
    const state = await getBackgroundState();
    if (!state.inactive) {
        await completeResume(state.generation);
        status.textContent = `Privacy resume acknowledged (${++resumes}).`;
    }
}
onResume(() => { void resume().catch(() => { status.textContent = "FAIL: privacy resume"; }); });
async function rejected(operation: () => Promise<unknown>, expected: string) {
    try { await operation(); } catch (error) {
        if (typeof error === "object" && error && (error as { code?: string }).code === expected) return;
        if (typeof error === "string" && error.includes(expected)) return;
        throw new Error("Unexpected native error or missing permission");
    }
    throw new Error("Native validation was bypassed");
}
document.getElementById("check")!.onclick = async () => {
    try {
        const biometric = await getStatus();
        await resume();
        // Invalid inputs are rejected before authentication or Keychain access.
        await rejected(() => storeKey("smoke-test", "invalid"), "invalid_request");
        await rejected(() => getKey("x".repeat(129)), "invalid_request");
        await rejected(() => shareFile("../invalid", ""), "Invalid file sharing request");
        status.textContent = `PASS: all six plugin command permissions and native validation. Biometrics available: ${biometric.available}.`;
    } catch { status.textContent = "FAIL: plugin routing, permissions or validation."; }
};
document.getElementById("share")!.onclick = async () => {
    try {
        const result = await shareFile("plugin-smoke.txt", btoa("Synthetic local plugin test. No account data."));
        status.textContent = `PASS: share sheet returned completed=${result.completed}.`;
    } catch { status.textContent = "FAIL: native sharing."; }
};
void resume();
