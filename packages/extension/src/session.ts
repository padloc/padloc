import type { Storage } from "webextension-polyfill";

export const sessionKey = "pl_unlockSession";
export const autoLockAlarm = "pl_autoLock";

export interface UnlockSession {
    id: string;
    accountId: string;
    masterKey: string;
    lastActivity: number;
    expiresAt: number | null;
}

export interface LockSettings {
    autoLock: boolean;
    autoLockDelay: number;
}

export function lockDeadline(settings: LockSettings, lastActivity: number) {
    const delay = Number.isFinite(settings.autoLockDelay) ? Math.max(0, settings.autoLockDelay) : 0;
    return settings.autoLock ? lastActivity + delay * 60000 : null;
}

export function isValidSession(session: UnlockSession, accountId: string | undefined, now = Date.now()) {
    return (
        !!session &&
        typeof session.id === "string" &&
        !!session.id &&
        typeof session.masterKey === "string" &&
        !!session.masterKey &&
        !!accountId &&
        session.accountId === accountId &&
        Number.isFinite(session.lastActivity) &&
        (session.expiresAt === null || (Number.isFinite(session.expiresAt) && session.expiresAt > now))
    );
}

// Keys must only ever be written to storage.session, never storage.local/sync.
// Session storage is restricted to trusted extension contexts by default.
export class SessionStore {
    constructor(
        private storage: Pick<Storage.StorageArea, "get" | "set" | "remove">,
        private alarms: {
            clear(name: string): Promise<boolean>;
            create(name: string, info: { when: number }): void | Promise<void>;
        }
    ) {}

    async read(): Promise<UnlockSession | undefined> {
        return (await this.storage.get(sessionKey))[sessionKey] as UnlockSession | undefined;
    }

    async write(session: UnlockSession) {
        await this.storage.set({ [sessionKey]: session });
        await this.schedule(session);
    }

    async schedule(session: UnlockSession) {
        await this.alarms.clear(autoLockAlarm);
        if (session.expiresAt !== null) {
            await this.alarms.create(autoLockAlarm, { when: session.expiresAt });
        }
    }

    async clear() {
        await this.storage.remove(sessionKey);
        await this.alarms.clear(autoLockAlarm);
    }
}
