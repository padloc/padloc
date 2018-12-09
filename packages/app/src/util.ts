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
