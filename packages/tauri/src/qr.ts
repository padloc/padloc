import { scan, cancel, checkPermissions, requestPermissions, Format } from "@tauri-apps/plugin-barcode-scanner";

export class NativeQRScanner {
    private _session: { cancelled: boolean; started: boolean; finished: Promise<void> } | null = null;
    private _stopping: Promise<void> = Promise.resolve();

    async scan(): Promise<string> {
        if (this._session) throw new Error("A QR scan is already running.");
        let complete!: () => void;
        const finished = new Promise<void>((resolve) => {
            complete = resolve;
        });
        const session = { cancelled: false, started: false, finished };
        this._session = session;
        let backgrounds: string[] | undefined;
        try {
            await this._stopping;
            if (session.cancelled) throw new Error("Scan cancelled.");
            let permission = await checkPermissions();
            if (session.cancelled) throw new Error("Scan cancelled.");
            if (permission === "prompt") permission = await requestPermissions();
            if (session.cancelled) throw new Error("Scan cancelled.");
            if (permission !== "granted")
                throw new Error("Camera access is denied. Enable camera access in Settings to scan QR codes.");
            backgrounds = [document.body.style.background, document.documentElement.style.background];
            document.body.style.background = document.documentElement.style.background = "transparent";
            session.started = true;
            const result = await scan({ formats: [Format.QRCode], cameraDirection: "back", windowed: true });
            if (session.cancelled) throw new Error("Scan cancelled.");
            if (typeof result.content !== "string") throw new Error("The scanner returned an invalid QR result.");
            return result.content;
        } catch (error) {
            const message =
                typeof error === "string"
                    ? error
                    : error && typeof (error as { message?: unknown }).message === "string"
                    ? (error as { message: string }).message
                    : "The camera scanner is unavailable on this device.";
            throw new Error(message);
        } finally {
            // Native scanning tears itself down after success/error. Avoid an
            // extra cancel after success, which can race a subsequent scan.
            if (backgrounds) {
                document.body.style.background = backgrounds[0];
                document.documentElement.style.background = backgrounds[1];
            }
            if (this._session === session) this._session = null;
            complete();
        }
    }

    stop(): Promise<void> {
        const session = this._session;
        if (!session || session.cancelled) return this._stopping;
        session.cancelled = true;
        this._session = null;
        this._stopping = (async () => {
            if (session.started) await cancel();
            await session.finished;
        })();
        return this._stopping;
    }
}
