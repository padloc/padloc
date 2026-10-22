import { openUrl } from "@tauri-apps/plugin-opener";

export async function openExternalLink(value: string): Promise<void> {
    const url = new URL(value);
    if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
        throw new Error("This link type is not supported.");
    }
    if (url.username || url.password) throw new Error("Links containing credentials are not supported.");
    await openUrl(url.href);
}

// The shared platform interface is fire-and-forget. Report failures without
// exposing the URL, which may contain a vault value or other sensitive data.
export function launchExternalLink(value: string): void {
    void openExternalLink(value).catch(async () => {
        const { alert } = await import("@padloc/app/src/lib/dialog");
        const { translate } = await import("@padloc/locale/src/translate");
        await alert(translate("Unable to open this link. Please check the address and try again."), { type: "warning" });
    });
}

export function initializeExternalLinks() {
    // Shared legacy callers use window.open without consuming its return value.
    // Keep the browser handoff in the wrapper rather than changing app callers.
    window.open = (url?: string | URL) => {
        if (url) launchExternalLink(String(url));
        return null;
    };
    document.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        const anchor = event.composedPath().find((node): node is HTMLAnchorElement =>
            node instanceof HTMLAnchorElement
        );
        if (!anchor || anchor.hasAttribute("download")) return;
        const href = anchor.getAttribute("href");
        // Relative URLs and fragments belong to the app's existing router.
        if (!href) return;
        const value = href.trim();
        if (!value.startsWith("//") && !/^[a-z][a-z\d+.-]*:/i.test(value)) return;
        event.preventDefault();
        event.stopPropagation();
        launchExternalLink(value.startsWith("//") ? `https:${value}` : value);
    }, true);
}
