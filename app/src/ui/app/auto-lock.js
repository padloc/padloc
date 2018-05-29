import '../base/base.js';

padlock.AutoLockMixin = (superClass) => {

    return class AutoLockMixin extends superClass {

        constructor() {
            super();

            const moved = padlock.util.debounce(() => this._autoLockChanged(), 300);
            document.addEventListener("touchstart", moved, { passive: true });
            document.addEventListener("keydown", moved);
            document.addEventListener("mousemove", moved);

            document.addEventListener("pause", () => this._pause());
            document.addEventListener("resume", () => this._resume());
        }

        static get observers() { return [
            "_autoLockChanged(settings.autoLock, settings.autoLockDelay, locked, isSynching)"
        ]; }

        get lockDelay() {
            return this.settings.autoLockDelay * 60 * 1000;
        }

        _cancelAutoLock() {
            this._pausedAt = null;
            if (this._lockTimeout) {
                clearTimeout(this._lockTimeout);
            }
            if (this._lockNotificationTimeout) {
                clearTimeout(this._lockNotificationTimeout);
            }
        }

        // Handler for cordova `pause` event. Records the current time for auto locking when resuming
        _pause() {
            this._pausedAt = new Date();
        }

        // Handler for cordova `resume` event. If auto lock is enabled and the specified time has passed
        // since the app was paused, locks the app
        _resume() {
            if (
                this.settings.autoLock &&
                !this.locked &&
                !this.isSynching &&
                this._pausedAt &&
                new Date().getTime() - this._pausedAt.getTime() > this.lockDelay
            ) {
                this._doLock();
            }
            this._autoLockChanged();
        }

        _doLock() {
            this.unloadData();
            this.dispatch("auto-lock");
        }

        _autoLockChanged() {
            this._cancelAutoLock();

            if (this.settings.autoLock && !this.locked && !this.isSynching) {
                this._lockTimeout = setTimeout(() => this._doLock(), this.lockDelay);
                this._lockNotificationTimeout = setTimeout(() => {
                    if (!this.locked && !this._pausedAt) {
                        this.notify($l("Auto-lock in 10 seconds"), "info", 3000);
                    }
                }, this.lockDelay - 10000);
            }
        }

    };

};
