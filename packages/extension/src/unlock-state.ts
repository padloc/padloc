import { Storable, Storage } from "@padloc/core/src/storage";
import { Err, ErrorCode } from "@padloc/core/src/error";

export const autoLockAlarm = "pl_autoLock";

export class UnlockState extends Storable {
    // One stored unlock state; unlockId identifies each individual unlock.
    id = "unlockState";
    unlockId = "";
    accountId = "";
    masterKey = "";
    // Missing timestamps must fail validation; null explicitly disables expiry.
    lastActivity = NaN;
    expiresAt: number | null = NaN;

    constructor(init: Partial<UnlockState> = {}) {
        super();
        Object.assign(this, init);
    }
}

const unlockStateRecord = new UnlockState();
export const unlockStateKey = `${unlockStateRecord.kind}_${unlockStateRecord.id}`;

export interface LockSettings {
    autoLock: boolean;
    autoLockDelay: number;
}

export function lockDeadline(settings: LockSettings, lastActivity: number) {
    const delay = Number.isFinite(settings.autoLockDelay) ? Math.max(0, settings.autoLockDelay) : 0;
    return settings.autoLock ? lastActivity + delay * 60000 : null;
}

export function isValidUnlockState(unlockState: UnlockState, accountId: string | undefined, now = Date.now()) {
    return (
        !!unlockState &&
        typeof unlockState.unlockId === "string" &&
        !!unlockState.unlockId &&
        typeof unlockState.masterKey === "string" &&
        !!unlockState.masterKey &&
        !!accountId &&
        unlockState.accountId === accountId &&
        Number.isFinite(unlockState.lastActivity) &&
        (unlockState.expiresAt === null || (Number.isFinite(unlockState.expiresAt) && unlockState.expiresAt > now))
    );
}

// Unlock keys must use ExtensionSessionStorage, never a persistent local/sync adapter.
// Session storage is restricted to trusted extension contexts by default.
export class UnlockStateStore {
    constructor(
        private _storage: Storage,
        private _alarms: {
            clear(name: string): Promise<boolean>;
            create(name: string, info: { when: number }): void | Promise<void>;
        }
    ) {}

    async read(): Promise<UnlockState | undefined> {
        try {
            return await this._storage.get(UnlockState, "unlockState");
        } catch (e) {
            if (e instanceof Err && e.code === ErrorCode.NOT_FOUND) {
                return undefined;
            }
            throw e;
        }
    }

    async write(unlockState: UnlockState) {
        await this._storage.save(unlockState);
        await this.schedule(unlockState);
    }

    async schedule(unlockState: UnlockState) {
        await this._alarms.clear(autoLockAlarm);
        if (unlockState.expiresAt !== null) {
            await this._alarms.create(autoLockAlarm, { when: unlockState.expiresAt });
        }
    }

    async clear() {
        await this._storage.delete(new UnlockState());
        await this._alarms.clear(autoLockAlarm);
    }
}
