import { getWordList } from "@padloc/locale/src/wordlists";
import { randomNumber } from "./util";

export { AVAILABLE_LANGUAGES } from "@padloc/locale/src/wordlists";

/**
 * Generates a passphrase consisting of a number of words randomly selected
 * from a word list. Motivated by http://world.std.com/~reinhold/diceware.html
 */
export async function generatePassphrase(nWords = 4, separator = "-", languages = ["en"]) {
    const words = [];
    const list: string[] = [];

    for (const lang of languages) {
        list.push(...(await getWordList(lang)));
    }

    // Fall back to englisch if no word lists were found for provided languages
    if (!list.length) {
        list.push(...(await getWordList("en")));
    }

    for (let i = 0; i < nWords; i++) {
        words.push(list[await randomNumber(0, list.length - 1)]);
    }

    return words.join(separator);
}
