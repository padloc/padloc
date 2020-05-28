import { Err, ErrorCode } from "./error";

export interface Migration {
    from: string;
    to: string;
    transforms: {
        [kind: string]: {
            up: (inp: any, kind?: string) => any;
            down: (inp: any, kind?: string) => any;
        };
    };
}

export const MIGRATIONS: Migration[] = [
    {
        from: "3.0.14",
        to: "3.1.0",
        transforms: {
            account: {
                up: ({ mainVault, orgs, ...rest }: any) => ({
                    mainVault: { id: mainVault },
                    orgs: orgs.map((org: any) => ({
                        id: org
                    })),
                    ...rest
                }),
                down: ({ mainVault, orgs, ...rest }: any) => ({
                    mainVault: mainVault.id,
                    orgs: orgs.map((org: any) => org.id),
                    ...rest
                })
            },
            all: {
                up: (raw: any, kind?: string) => ({ kind, ...raw }),
                down: ({ kind, ...rest }) => rest
            }
        }
    }
];

export const EARLIEST_VERSION = MIGRATIONS[0].from;
export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

function norm(version: string = EARLIEST_VERSION): string {
    return version
        .split(".")
        .map(part => part.padStart(3, "0"))
        .join();
}

export function upgrade(kind: string, raw: any, version: string = LATEST_VERSION): any {
    if (norm(raw.version) > norm(LATEST_VERSION)) {
        throw new Err(
            ErrorCode.UNSUPPORTED_VERSION,
            "An object could not be decoded because it was encoded with a newer version of Padloc. " +
                "Please update to the latest version to fix this problem!"
        );
    }

    const migration = MIGRATIONS.find(
        m => norm(m.from) >= norm(raw.version || EARLIEST_VERSION) && norm(m.to) <= norm(version)
    );

    if (migration) {
        let transform = migration.transforms["all"];
        raw = transform ? transform.up(raw, kind) : raw;
        transform = migration.transforms[kind];
        raw = transform ? transform.up(raw, kind) : raw;
        raw.version = migration.to;
        return upgrade(kind, raw, version);
    } else {
        raw.version = version;
        return raw;
    }
}

export function downgrade(kind: string, raw: any, version: string = LATEST_VERSION): any {
    const migration = MIGRATIONS.reverse().find(
        m => norm(m.to) <= norm(raw.version || LATEST_VERSION) && norm(m.from) >= norm(version)
    );

    if (migration) {
        let transform = migration.transforms[kind];
        raw = transform ? transform.down(raw, kind) : raw;
        transform = migration.transforms["all"];
        raw = transform ? transform.down(raw, kind) : raw;
        raw.version = migration.from;
        return downgrade(kind, raw, version);
    } else {
        raw.version = version;
        return raw;
    }
}
