export interface Migration {
    from: string;
    to: string;
    transforms: {
        [kind: string]: {
            up: (inp: any) => any;
            down: (inp: any) => any;
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
            }
        }
    }
];

export const EARLIEST_VERSION = MIGRATIONS[0].to;
export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

function norm(version: string): string {
    return version
        .split(".")
        .map(part => part.padStart(3, "0"))
        .join();
}

export function upgrade(kind: string, raw: any, version: string = LATEST_VERSION): any {
    const migration = MIGRATIONS.find(
        m => norm(m.from) >= norm(raw.version || EARLIEST_VERSION) && norm(m.to) <= norm(version)
    );

    if (migration) {
        const transform = migration.transforms[kind];
        raw = transform ? transform.up(raw) : raw;
        raw.version = migration.to;
        return upgrade(raw, version);
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
        const transform = migration.transforms[kind];
        raw = transform ? transform.down(raw) : raw;
        raw.version = migration.from;
        return downgrade(raw, version);
    } else {
        raw.version = version;
        return raw;
    }
}
