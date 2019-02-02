import { Server } from "./server";
import { DeviceInfo } from "./platform";
import { EventEmitter } from "./event-target";

export interface Request {
    method: string;
    params?: any[];
    auth?: Authentication;
    device?: DeviceInfo;
}

export interface Response {
    result: any;
    error?: Error;
    auth?: Authentication;
}

export interface Authentication {
    session: string;
    time: string;
    signature: string;
}

export interface Error {
    code: number | string;
    message: string;
}

export interface Sender {
    send(req: Request, progress?: RequestProgress): Promise<Response>;
}

export interface Receiver {
    listen(handler: (req: Request) => Promise<Response>): void;
}

export class DirectSender implements Sender {
    constructor(private server: Server) {}

    send(req: Request) {
        return this.server.handle(req);
    }
}

interface Progress {
    loaded: number;
    total: number;
}

export class RequestProgress extends EventEmitter {
    uploadComplete: Promise<void>;
    downloadComplete: Promise<void>;

    get uploadProgress() {
        return this._uploadProgress;
    }

    set uploadProgress(progress: Progress) {
        this._uploadProgress = progress;
        this.dispatch("upload-progress", progress);
        this.dispatch("progress", this.progress);
        if (progress.loaded === progress.total) {
            this._resolveUploadPromise!();
        }
    }

    get downloadProgress() {
        return this._downloadProgress;
    }

    set downloadProgress(progress: Progress) {
        this._downloadProgress = progress;
        this.dispatch("download-progress", progress);
        this.dispatch("progress", this.progress);
        if (progress.loaded === progress.total) {
            this._resolveDownloadPromise!();
        }
    }

    get progress() {
        return {
            loaded: this.uploadProgress.loaded + this.downloadProgress.loaded,
            total: this.uploadProgress.total + this.downloadProgress.total
        };
    }

    get complete() {
        return Promise.all([this.uploadComplete, this.downloadComplete]);
    }

    set error(error: Error | undefined) {
        this._error = error;
        if (error) {
            this.dispatch("error", { error });
            this.uploadProgress = this.downloadProgress = { loaded: 0, total: 0 };
        }
    }

    get error() {
        return this._error;
    }

    private _uploadProgress: Progress = { loaded: 0, total: 0 };
    private _downloadProgress: Progress = { loaded: 0, total: 0 };

    private _error?: Error;

    private _resolveUploadPromise?: () => void;
    private _resolveDownloadPromise?: () => void;

    constructor() {
        super();
        this.uploadComplete = new Promise(resolve => (this._resolveUploadPromise = resolve));
        this.downloadComplete = new Promise(resolve => (this._resolveDownloadPromise = resolve));
    }
}
