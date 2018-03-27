import { Client } from "./ajax";
import { getAppVersion } from "./platform";

let initCb: () => void;
let client: Client;
let trackingID = "";
let statsApi:{ get(): Promise<any>, set(data: any): Promise<void> } ;

const initialized = new Promise((resolve) => initCb = resolve);

export function init(cl: Client, st?: { get(): Promise<any>, set(data: any): Promise<void> }) {
    client = cl;
    statsApi = st || {
        get() { return Promise.resolve({}) },
        set() { return Promise.resolve() }
    };
    initCb();
}

export function setTrackingID(id: string) {
    trackingID = id;
    return statsApi.set({ trackingID: id });
}

let ready = initialized
    .then(() => Promise.all([
        statsApi.get(),
        getAppVersion()
    ]))
    .then(([stats, version]) => {
        trackingID = stats.trackingID as string;
        const launchCount = typeof stats.launchCount === "number" ? (stats.launchCount as number)+ 1 : 1;
        const isFirstLaunch = !stats.firstLaunch;
        const firstLaunch = stats.firstLaunch || new Date().getTime();

        if (isFirstLaunch) {
            track("Install");
        } else if (stats.lastVersion !== version) {
            track("Update", { "From Version": stats.lastVersion });
        }

        return statsApi.set({
            firstLaunch: firstLaunch,
            lastLaunch: new Date().getTime(),
            launchCount: launchCount,
            lastVersion: version
        });
    });

export function track(event: string, props?: { [prop: string]: number|string }) {
    const data = {
        event: event,
        props: props || {},
        trackingID: trackingID
    };

    if (data.props.Email) {
        ready = statsApi.set({ "email": data.props.Email });
    }

    ready = ready.then(() => statsApi.get())
        .then((stats) => {
            Object.assign(data.props, {
                "First Launch": stats.firstLaunch && new Date(stats.firstLaunch as number).toISOString(),
                "Launch Count": stats.launchCount,
                "Custom Server": stats.syncCustomHost || false,
                "Email": stats.email
            });

            if (stats.lastSync) {
                data.props["Last Sync"] = new Date(stats.lastSync as number).toISOString();
            }

            if (stats.lastAskedFeedback) {
                Object.assign(data.props, {
                    "Last Rated": new Date(stats.lastAskedFeedback as number).toISOString(),
                    "Rated Version": stats.lastRatedVersion,
                    "Rating": stats.lastRating
                });
            }

            if (stats.lastReviewed) {
                data.props["Last Reviewed"] = new Date(stats.lastReviewed as number).toISOString();
            }
        })
        .then(() => client.request(
            "POST",
            client.urlForPath("track"),
            JSON.stringify(data)
        ))
        .then((r) => {
            const res = JSON.parse(r.responseText);
            return setTrackingID(res.trackingID);
        })
        .catch(() => {});

    return ready;
}
