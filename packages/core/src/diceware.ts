import { WORDLIST_EN } from "./wordlists";
import { randomNumber } from "./util";

/**
 * Generates a passphrase consisting of a number of words randomly selected
 * from a word list. Motivated by http://world.std.com/~reinhold/diceware.html
 */
export async function generatePassphrase(nWords = 4, separator = "-") {
    const words = [];
    const list = WORDLIST_EN;

    for (let i = 0; i < nWords; i++) {
        words.push(list[await randomNumber(0, list.length - 1)]);
    }

    return words.join(separator);
}
