import { resolveLanguage } from "./util";
import { getDeviceInfo } from "./platform";

/**
 * Simple map of translations
 */
export interface Translations {
    [lang: string]: { [msg: string]: string };
}

let translations: Translations = {};
let language: string;

/**
 * Translate `msg` into the current language. The message can contain simple numbered
 * placeholders that are substituted after translation with the corresponding arguments
 * passed after `msg`. E.g:
 *
 * ```ts
 * localize("Hello! My name is {0}. I am from {1}. How are you?", name, country);
 * ```
 */
export function localize(msg: string, ...fmtArgs: string[]) {
    // Choose translations for current language
    const lang = translations[language];

    // Look up translation. If no translation is found, use the original message.
    let res = (lang && lang[msg]) || msg;

    // Replace placeholders with function arguments
    for (let i = 0; i < fmtArgs.length; i++) {
        res = res.replace(new RegExp(`\\{${i}\\}`, "g"), fmtArgs[i]);
    }

    return res;
}

/**
 * Set available translations. This function will usually be called by an
 * auto-generated script which is loaded during app initialization, removing
 * the need for asynchronous fetching of translation files.
 */
export async function loadTranslations(t: Translations) {
    translations = t;
    language = resolveLanguage((await getDeviceInfo()).locale, translations);
}
