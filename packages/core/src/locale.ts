import { resolveLanguage } from "./util";
import { getDeviceInfo } from "./platform";

export interface Translations {
    [lang: string]: { [msg: string]: string };
}

let translations: Translations = {};
let language: string;

export function localize(msg: string, ...fmtArgs: string[]) {
    const lang = translations[language];
    let res = (lang && lang[msg]) || msg;

    for (let i = 0; i < fmtArgs.length; i++) {
        res = res.replace(new RegExp(`\\{${i}\\}`, "g"), fmtArgs[i]);
    }

    res = res.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    return res;
}

export async function loadTranslations(t: Translations) {
    translations = t;
    language = resolveLanguage((await getDeviceInfo()).locale, translations);
}
