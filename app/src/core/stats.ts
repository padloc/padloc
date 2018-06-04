import { FileSource } from "./source";

const statsSource = new FileSource("stats.json");

export type Stats = { [prop: string]: number | string };
let stats: Stats;

const statsLoaded = statsSource.get().then(data => {
    try {
        stats = JSON.parse(data);
    } catch (e) {
        stats = {};
    }
});
const saveStats = () => statsSource.set(JSON.stringify(stats));

export async function get(): Promise<Stats> {
    await statsLoaded;
    return stats;
}

export async function set(data: Stats): Promise<void> {
    await statsLoaded;
    Object.assign(stats, data);
    return saveStats();
}
