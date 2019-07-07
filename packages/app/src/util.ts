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

export async function formatDateFromNow(date: Date | string | number, addSuffix = true) {
    const { distanceInWordsToNow } = await loadScript("/vendor/date-fns.js", "dateFns");
    return distanceInWordsToNow(date, { addSuffix });
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

export function mediaType(mimeType: string) {
    const match = mimeType.match(/(.*)\/(.*)/);
    const [, type, subtype] = match || ["", "", ""];

    switch (type) {
        case "video":
            return "video";
        case "audio":
            return "audio";
        case "image":
            return "image";
        case "text":
            switch (subtype) {
                case "csv":
                // return "csv";
                case "plain":
                    return "text";
                default:
                    return "code";
            }
        case "application":
            switch (subtype) {
                case "pdf":
                    return "pdf";
                case "json":
                    return "code";
                case "zip":
                case "x-7z-compressed":
                case "x-freearc":
                case "x-bzip":
                case "x-bzip2":
                case "java-archive":
                case "x-rar-compressed":
                case "x-tar":
                    return "archive";
            }
        default:
            return "";
    }
}

export function fileIcon(mimeType: string) {
    const mType = mediaType(mimeType);
    return mType ? `file-${mType}` : "file";
}

export function fileSize(size: number = 0) {
    return size < 1e6 ? Math.ceil(size / 10) / 100 + " KB" : Math.ceil(size / 10000) / 100 + " MB";
}

export function mask(value: string): string {
    return value && value.replace(/[^\n]/g, "\u2022");
}
