/**
 * Options for generating a fingerprint graphic
 */
export interface Options {
    /** target height (number of cells) */
    height: number;
    /** target width (number of cells) */
    width: number;
    /** symbols to be mapped against calculated values */
    symbols: string[];
}

/**
 * Represents a "fingerprint" visualization of a certain [[height]] and [[width]],
 * the [[values]] property contains the raw values generated using the [drunken
 * bishop](http://www.dirk-loss.de/sshvis/drunken_bishop.pdf) while [[symbols]]
 * represents the same values by mapping the on the symbols defined in [[Options.symbols]].
 */
export interface Fingerprint {
    width: number;
    height: number;
    values: number[][];
    symbols: string[][];
}

type Move = "00" | "01" | "10" | "11";
type Position = [number, number];

/** Default options */
export const defaults: Options = {
    height: 9,
    width: 17,
    symbols: [" ", ".", "o", "+", "=", "*", "B", "O", "X", "@", "%", "&", "#", "/", "^", "S", "E"]
};

// Converts a buffer to a binary moves array
function getMoves(bytes: Uint8Array): Move[] {
    const moves = [];
    for (const b of bytes) {
        let str = b.toString(2);
        while (str.length < 8) {
            str = "0" + str;
        }
        moves.push(str.slice(6, 8), str.slice(4, 6), str.slice(2, 4), str.slice(0, 2));
    }
    return moves as Move[];
}

// Gets the steps from a set of moves and the box's height and width
function getSteps(moves: Move[], width: number, height: number): Position[] {
    let pos: Position = [(width - 1) / 2, (height - 1) / 2];
    const steps = [pos];

    for (const move of moves) {
        let [x, y] = pos;

        switch (move) {
            case "00":
                x--, y--;
                break;
            case "01":
                x++, y--;
                break;
            case "10":
                x--, y++;
                break;
            case "11":
                x++, y++;
                break;
        }

        pos = [Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(height - 1, y))];
        steps.push(pos);
    }

    return steps;
}

// Renders the randomart image from a given fingerprint
export function getValues(fingerprint: Uint8Array, opts: Partial<Options> = {}): number[][] {
    const { width, height } = Object.assign({}, defaults, opts);

    if (height % 2 !== 1 || width % 2 !== 1) {
        throw "The height and width options must be odd numbers";
    }

    if (fingerprint.length % 2 !== 0) {
        throw "The fingerprint length must be an even number";
    }

    const moves = getMoves(fingerprint);
    const steps = getSteps(moves, width, height);
    const grid: number[][] = [];
    for (let i = 0; i < height; i++) {
        grid.push(new Array(width).fill(0));
    }

    for (const [x, y] of steps) {
        grid[y][x]++;
    }

    const [x0, y0] = steps[0];
    const [x1, y1] = steps[steps.length - 1];
    grid[y0][x0] = 15;
    grid[y1][x1] = 16;
    return grid;
}

/**
 * Generates a visualisation of a "fingerprint" similar to the ascii-based
 * visualization method used by OpenSSH. Generates a "heat map" of values on a
 * grid of a given width and height using the "drunken bishop" algorithm
 * desribed in [this paper](http://www.dirk-loss.de/sshvis/drunken_bishop.pdf).
 */
export function randomArt(fingerprint: Uint8Array, opts: Partial<Options> = {}): Fingerprint {
    const options = Object.assign({}, defaults, opts);
    const vals = getValues(fingerprint, options);
    const symbols = opts.symbols || defaults.symbols;
    return {
        width: options.width,
        height: options.height,
        values: vals,
        symbols: vals.map(line => line.map(val => symbols[val]))
    };
}
