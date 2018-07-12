import { unmarshal } from "./encoding";

export enum ErrorCode {
    // Crypto Errors
    INVALID_CONTAINER_DATA = "invalid_container_data",
    UNSUPPORTED_CONTAINER_VERSION = "unsupported_container_version",
    INVALID_CIPHER_PARAMS = "invalid_cipher_params",
    INVALID_KEY_PARAMS = "invalid_key_params",
    DECRYPTION_FAILED = "decryption_failed",
    ENCRYPTION_FAILED = "encryption_failed",
    NOT_SUPPORTED = "not_supported",

    // HTTP Client Errors
    FAILED_CONNECTION = "failed_connection",
    UNEXPECTED_REDIRECT = "unexpected_redirect",

    // HTTP Server Errors
    BAD_REQUEST = "bad_request",
    INVALID_SESSION = "invalid_auth_token",
    SESSION_EXPIRED = "expired_auth_token",
    DEPRECATED_API_VERSION = "deprecated_api_version",

    // Generic Errors
    CLIENT_ERROR = "client_error",
    SERVER_ERROR = "server_error",

    NOT_FOUND = "not_found",
    INVALID_CSV = "invalid_csv"
}

export class Err extends Error {
    report = false;
    display = false;
    private _status?: number;

    constructor(public code: ErrorCode, message = "", opts?: { report?: boolean; display?: boolean; status?: number }) {
        super(message);
        if (opts) {
            Object.assign(this, { report: opts.report, display: opts.display, _status: opts.status });
        }
    }

    get status(): number {
        return this._status || statusFromCode(this.code);
    }
}

export function errFromRequest(request: XMLHttpRequest): Err {
    try {
        const { error, message } = unmarshal(request.responseText) as { error: ErrorCode; message: string };
        return new Err(error, message, { status: request.status });
    } catch (e) {
        switch (request.status.toString()[0]) {
            case "0":
                return new Err(ErrorCode.FAILED_CONNECTION, request.responseText, { status: request.status });
            case "3":
                return new Err(ErrorCode.UNEXPECTED_REDIRECT, request.responseText, { status: request.status });
            case "4":
                return new Err(ErrorCode.CLIENT_ERROR, request.responseText, { status: request.status });
            default:
                return new Err(ErrorCode.SERVER_ERROR, request.responseText, { status: request.status });
        }
    }
}

function statusFromCode(code: ErrorCode): number {
    switch (code) {
        case ErrorCode.BAD_REQUEST:
            return 400;
        case ErrorCode.INVALID_SESSION:
        case ErrorCode.SESSION_EXPIRED:
            return 401;
        case ErrorCode.NOT_FOUND:
            return 404;
        case ErrorCode.DEPRECATED_API_VERSION:
            return 406;
        default:
            return 500;
    }
}
