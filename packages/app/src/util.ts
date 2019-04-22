const loaded: Map<string, Promise<any>> = new Map<string, Promise<any>>();
export function loadScript(src: string, global?: string): Promise<any> {
    if (loaded.has(src)) {
        return loaded.get(src)!;
    }

    const s = document.createElement("script");
    s.src = src;
    s.type = "text/javascript";
    const p = new Promise((resolve, reject) => {
        s.onload = () => resolve(global ? window[global] : undefined);
        s.onerror = e => reject(e);
        document.body!.appendChild(s);
    });

    loaded.set(src, p);
    return p;
}

export async function formatDateFromNow(date: Date | string | number) {
    const { distanceInWordsToNow } = await loadScript("/vendor/date-fns.js", "dateFns");
    return distanceInWordsToNow(date, { addSuffix: true });
}

export async function passwordStrength(pwd: string): Promise<{ score: number }> {
    const zxcvbn = await loadScript("/vendor/zxcvbn.js", "zxcvbn");
    return zxcvbn(pwd);
}

export function toggleAttribute(el: Element, attr: string, on: boolean) {
    if (on) {
        el.setAttribute(attr, "");
    } else {
        el.removeAttribute(attr);
    }
}

export function fileIcon(mimeType: string) {
    const match = mimeType.match(/(.*)\/(.*)/);
    const [, type, subtype] = match || ["", "", ""];

    switch (type) {
        case "video":
            return "file-video";
        case "audio":
            return "file-audio";
        case "image":
            return "file-image";
        case "text":
            switch (subtype) {
                case "csv":
                // return "file-csv";
                case "plain":
                    return "file-text";
                default:
                    return "file-code";
            }
        case "application":
            switch (subtype) {
                case "pdf":
                    return "file-pdf";
                case "json":
                    return "file-code";
                case "zip":
                case "x-7z-compressed":
                case "x-freearc":
                case "x-bzip":
                case "x-bzip2":
                case "java-archive":
                case "x-rar-compressed":
                case "x-tar":
                    return "file-archive";
            }

        default:
            return "file";
    }
}

export function fileSize(size: number = 0) {
    return size < 1e6 ? Math.ceil(size / 10) / 100 + " KB" : Math.ceil(size / 10000) / 100 + " MB";
}
