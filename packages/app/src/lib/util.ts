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
        s.onerror = (e: any) => reject(e);
        document.head.appendChild(s);
    });

    loaded.set(src, p);
    return p;
}

export async function formatDateFromNow(date: Date | string | number, addSuffix = true) {
    const { formatDistanceToNow } = await import(/* webpackChunkName: "date-fns" */ "date-fns");
    return formatDistanceToNow(new Date(date), { addSuffix });
}

export async function formatDate(date: Date | string | number) {
    return new Intl.DateTimeFormat().format(new Date(date));
}

export async function passwordStrength(pwd: string): Promise<{ score: number }> {
    // @ts-ignore
    const { default: zxcvbn } = await import(/* webpackChunkName: "zxcvbn" */ "zxcvbn");
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
                case "pkcs8":
                case "pkcs10":
                case "pkix-cert":
                case "pkix-crl":
                case "pkcs7-mime":
                case "x-x509-ca-cert":
                case "x-x509-user-cert":
                case "x-pkcs12":
                case "x-pkcs7-certificates":
                case "x-pkcs7-mime":
                case "x-pkcs7-crl":
                case "x-pem-file":
                case "x-pkcs12":
                case "x-pkcs7-certreqresp":
                    return "certificate";
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

export function isTouch(): boolean {
    return window.matchMedia("(hover: none)").matches;
}

export function openPopup(
    url = "",
    {
        name = "_blank",
        width = 500,
        height = 800,
    }: {
        url?: string;
        name?: string;
        width?: number;
        height?: number;
    } = {}
): Window | null {
    const { outerHeight, outerWidth, screenX, screenY } = window;
    const top = outerHeight / 2 + screenY - height / 2;
    const left = outerWidth / 2 + screenX - width / 2;
    return window.open(
        url,
        name,
        `toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=${width},height=${height},top=${top},left=${left}`
    );
}
