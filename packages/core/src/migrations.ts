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
                        id: org,
                    })),
                    ...rest,
                }),
                down: ({ mainVault, orgs, ...rest }: any) => ({
                    mainVault: mainVault.id,
                    orgs: orgs.map((org: any) => org.id),
                    ...rest,
                }),
            },
            all: {
                up: (raw: any, kind?: string) => ({ kind, ...raw }),
                down: ({ kind, ...rest }) => rest,
            },
        },
    },
    {
        from: "3.1.0",
        to: "4.0.0",
        transforms: {
            /**
             * - `id` property was renamed to `accountId`
             * - Removed `OrgRole.Suspended` in favor of the new `status` property,
             * which can be set to `OrgMemberStatus.Suspended`.
             */
            orgmember: {
                up: ({ id, role, ...rest }) => ({
                    accountId: id,
                    role: role === 3 ? 2 : role,
                    status: role === 3 ? "suspended" : "active",
                    ...rest,
                }),
                down: ({ accountId, role, status, ...rest }) => ({
                    id: accountId,
                    role: status === "suspended" ? 3 : role,
                    ...rest,
                }),
            },
            /**
             * Members are now primarily referenced by email since
             * `accountId` may not be defined yet for provisioned members.
             * This is actually a transform on `OrgGroup` but we need
             * to implement it on the `Org` level since we need access
             * to the `member` property to look up emails.
             */
            org: {
                up: ({ members, groups, ...rest }) => ({
                    members,
                    groups: groups.map(({ members: groupMembers, ...rest }: any) => ({
                        members: groupMembers.map(({ id }: any) => ({
                            accountId: id,
                            email: members.find((m: any) => m.id === id)?.email,
                        })),
                        ...rest,
                    })),
                    ...rest,
                }),
                down: ({ groups, ...rest }) => ({
                    groups: groups.map(({ members, ...rest }: any) => ({
                        members: members.map(({ accountId }: any) => ({ id: accountId })),
                        ...rest,
                    })),
                    ...rest,
                }),
            },
        },
    },
];

export const EARLIEST_VERSION = MIGRATIONS[0].from;
export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].to;

function norm(version: string = EARLIEST_VERSION): string {
    return version
        .split(".")
        .map((part) => part.padStart(3, "0"))
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
        (m) => norm(m.from) >= norm(raw.version || EARLIEST_VERSION) && norm(m.to) <= norm(version)
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
    const migration = [...MIGRATIONS]
        .reverse()
        .find((m) => norm(m.to) <= norm(raw.version || LATEST_VERSION) && norm(m.from) >= norm(version));

    if (migration) {
        let transform = migration.transforms[kind];
        raw = transform ? transform.down(raw, kind) : raw;
        transform = migration.transforms["all"];
        raw = transform ? transform.down(raw, kind) : raw;
        raw.version = migration.from;
        return downgrade(kind, raw, version);
    } else {
        if (!raw.version) {
            raw.version = LATEST_VERSION;
        }
        return raw;
    }
}
