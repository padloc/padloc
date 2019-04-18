import { Serializable } from "./encoding";
import { Server } from "./server";
import { DeviceInfo } from "./platform";
import { EventEmitter } from "./event-target";

/** RPC request object */
export class Request extends Serializable {
    /** Name of the method call */
    method: string = "";
    /** Arguments for the method */
    params?: any[];
    /** Data used to authenticate the request */
    auth?: Authentication;
    /** Info about the device the request is coming from */
    device?: DeviceInfo;

    fromRaw({ method, params, auth, device }: any) {
        this.device = device && new DeviceInfo().fromRaw(device);
        return super.fromRaw({ method, params, auth });
    }

    validate() {
        const { method, params, auth, device } = this;
        return (
            typeof method === "string" && (typeof params === "undefined" || Array.isArray(params)),
            (typeof auth === "undefined" ||
                (typeof auth.session === "string" &&
                    typeof auth.time === "string" &&
                    typeof auth.signature === "string")) &&
                (typeof device === "undefined" || device instanceof DeviceInfo)
        );
    }
}

/** RPC response object */
export class Response extends Serializable {
    /** The result of the RPC call */
    result: any = null;
    /** Error info, if an error occurred while processing the request */
    error?: Error;
    /** Data used to authenticate the response */
    auth?: Authentication;

    fromRaw({ result, error, auth }: any) {
        return super.fromRaw({ result, error, auth });
    }

    validate() {
        const { error, auth } = this;
        return (
            (typeof error === "undefined" ||
                (["string", "number"].includes(typeof error.code) && typeof error.message === "string")) &&
            (typeof auth === "undefined" ||
                (typeof auth.session === "string" &&
                    typeof auth.time === "string" &&
                    typeof auth.signature === "string"))
        );
    }
}

/** Authentication data */
export interface Authentication {
    /** The id of the [[Session]] used for authentication */
    session: string;
    /** A time stamp of the request/response time */
    time: string;
    /** The signature used to verify the authentiation */
    signature: string;
}

/** Error info */
export interface Error {
    /** Error code */
    code: number | string;
    /** Error message */
    message: string;
}

/** Generic interface for sending [[Request]]s */
export interface Sender {
    send(req: Request, progress?: RequestProgress): Promise<Response>;
}

/** Generic interface for receiving [[Request]]s and processing them into a [[Response]] */
export interface Receiver {
    listen(handler: (req: Request) => Promise<Response>): void;
}

/**
 * Stub implementation of the [[Sender]] interface, passing requests directly
 * into a [[Server]] instance.  this is useful for testing, where client and
 * server instances are managed by the same process
 */
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
