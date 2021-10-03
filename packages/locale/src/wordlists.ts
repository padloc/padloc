const loadWordListPromises = new Map<string, Promise<string[]>>();

export async function getWordList(lang: string): Promise<string[]> {
    lang = lang.toLowerCase();

    if (loadWordListPromises.has(lang)) {
        return loadWordListPromises.get(lang)!;
    }

    const promise = (async () => {
        try {
            const { default: words } = await import(`../res/wordlists/${lang}.json`);

            return words;
        } catch (e) {
            const dashIndex = lang.lastIndexOf("-");
            if (dashIndex !== -1) {
                return getWordList(lang.substring(0, dashIndex));
            } else {
                return [];
            }
        }
    })();

    loadWordListPromises.set(lang, promise);

    return promise;
}

export const AVAILABLE_LANGUAGES = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "es", label: "Español" },
    { value: "pt", label: "Português" },
    { value: "fr", label: "Français" },
];
