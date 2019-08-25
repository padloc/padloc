const loadLanguagePromises = new Map<string, Promise<void>>();
const languages = new Map<string, Map<string, string>>();
let defaultLanguage = "en";

export function setDefaultLanguage(lang: string) {
    defaultLanguage = lang;
}

export function getDefaultLanguage() {
    return defaultLanguage;
}

export async function loadLanguage(lang: string, setDefault = true): Promise<void> {
    lang = lang.toLowerCase();

    if (loadLanguagePromises.has(lang)) {
        return loadLanguagePromises.get(lang);
    }

    const promise = (async () => {
        try {
            const { default: items } = await import(`../res/translations/${lang}.json`);

            languages.set(lang, new Map<string, string>(items));

            if (setDefault) {
                defaultLanguage = lang;
            }
        } catch (e) {
            const dashIndex = lang.lastIndexOf("-");
            if (dashIndex !== -1) {
                return loadLanguage(lang.substring(0, dashIndex));
            } else {
                throw e;
            }
        }
    })();

    loadLanguagePromises.set(lang, promise);

    return promise;
}

/**
 * Resolves a given locale string to the approprivate available language
 */
export function resolveLanguage(locale: string, supportedLanguages: { [lang: string]: any }): string {
    const localeParts = locale.toLowerCase().split("-");

    while (localeParts.length) {
        const l = localeParts.join("-");
        if (supportedLanguages[l]) {
            return l;
        }

        localeParts.pop();
    }

    return Object.keys(supportedLanguages)[0];
}

/**
 * Translate `msg` into the current language. The message can contain simple numbered
 * placeholders that are substituted after translation with the corresponding arguments
 * passed after `msg`. E.g:
 *
 * ```ts
 * translate("Hello! My name is {0}. I am from {1}. How are you?", name, country);
 * ```
 */
export function translate(msg: string, ...fmtArgs: string[]) {
    // Choose translations for current language
    const lang = languages.get(defaultLanguage);

    // Look up translation. If no translation is found, use the original message.
    let res = (lang && lang.get(msg)) || msg;

    // Replace placeholders with function arguments
    for (let i = 0; i < fmtArgs.length; i++) {
        res = res.replace(new RegExp(`\\{${i}\\}`, "g"), fmtArgs[i]);
    }

    return res;
}
