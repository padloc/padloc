import { getBackgroundState, completeResume, onResume } from "../plugins/privacy-cover/guest-js";
import { getStatus, storeKey, getKey } from "../plugins/biometric-keystore/guest-js";
import { shareFile } from "../plugins/file-sharing/guest-js";

const status = document.getElementById("status")!;
let resumes = 0;
let holdResume = false;
const history = document.createElement("pre");
history.id = "history";
status.after(history);
new MutationObserver(() => {
    history.textContent = `${history.textContent}\n${status.textContent}`.slice(-4000);
}).observe(status, { childList: true, characterData: true, subtree: true });
async function resume() {
    const state = await getBackgroundState();
    if (!state.inactive) {
        if (holdResume && state.pausedAt) {
            holdResume = false;
            await completeResume(state.generation - 1);
            // Give native inspection time to verify stale acknowledgements leave
            // the cover and accessibility protection in place.
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
        await completeResume(state.generation);
        status.textContent = `Privacy resume acknowledged (${++resumes}).`;
    }
}
onResume(() => {
    void resume().catch(() => {
        status.textContent = "FAIL: privacy resume";
    });
});
async function rejected(operation: () => Promise<unknown>, expected: string) {
    try {
        await operation();
    } catch (error) {
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
    } catch {
        status.textContent = "FAIL: plugin routing, permissions or validation.";
    }
};
document.getElementById("share")!.onclick = async () => {
    try {
        const result = await shareFile("plugin-smoke.txt", btoa("Synthetic local plugin test. No account data."));
        status.textContent = `PASS: share sheet returned completed=${result.completed}.`;
    } catch {
        status.textContent = "FAIL: native sharing.";
    }
};
void resume();
document.getElementById("hold")!.onclick = () => {
    holdResume = true;
    status.textContent = "Next resume: stale acknowledgement, then valid acknowledgement after 10 seconds.";
};

// Public, disposable fixture; never use this value for an account or vault.
const syntheticKey = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)));
const syntheticId = "native-plugin-smoke-v1";
document.getElementById("store")!.onclick = async () => {
    status.textContent = "Waiting for biometric enrollment confirmation…";
    try {
        await storeKey(syntheticId, syntheticKey);
        status.textContent = "PASS: synthetic key stored after biometric authentication.";
    } catch (error) {
        status.textContent = `FAIL: storing key (${JSON.stringify(error)}).`;
    }
};
document.getElementById("read")!.onclick = async () => {
    status.textContent = "Waiting for fresh biometric authentication…";
    try {
        const result = await getKey(syntheticId);
        status.textContent =
            result.key === syntheticKey ? "PASS: authenticated key matches synthetic fixture." : "FAIL: key mismatch.";
    } catch (error) {
        status.textContent = `FAIL: reading key (${JSON.stringify(error)}).`;
    }
};
document.getElementById("cancel")!.onclick = async () => {
    status.textContent = "Cancel the biometric prompt to test rejection…";
    try {
        await rejected(() => getKey(syntheticId), "cancelled");
        status.textContent = "PASS: cancellation rejected key access.";
    } catch {
        status.textContent = "FAIL: cancellation did not reject key access.";
    }
};
document.getElementById("replace")!.onclick = async () => {
    status.textContent = "Cancel replacement; the original key must remain available…";
    try {
        await rejected(() => storeKey(syntheticId, btoa("x".repeat(32))), "cancelled");
        status.textContent = "PASS: replacement cancelled. Read original key to verify preservation.";
    } catch {
        status.textContent = "FAIL: replacement cancellation.";
    }
};
