import { unmarshal } from "./encoding";

export enum ErrorCode {
    // Crypto Errors
    INVALID_CONTAINER_DATA = "invalid_container_data",
    UNSUPPORTED_CONTAINER_VERSION = "unsupported_container_version",
    INVALID_ENCRYPTION_PARAMS = "invalid_encryption_params",
    INVALID_KEY_WRAP_PARAMS = "invalid_key_wrap_params",
    INVALID_KEY_PARAMS = "invalid_key_params",
    DECRYPTION_FAILED = "decryption_failed",
    ENCRYPTION_FAILED = "encryption_failed",
    NOT_SUPPORTED = "not_supported",
    PUBLIC_KEY_MISMATCH = "public_key_mismatch",
    MISSING_ACCESS = "missing_access",

    // HTTP Client Errors
    FAILED_CONNECTION = "failed_connection",
    UNEXPECTED_REDIRECT = "unexpected_redirect",

    // HTTP Server Errors
    BAD_REQUEST = "bad_request",
    INVALID_SESSION = "invalid_auth_token",
    SESSION_EXPIRED = "expired_auth_token",
    DEPRECATED_API_VERSION = "deprecated_api_version",
    INSUFFICIENT_PERMISSIONS = "insufficient_permissions",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    INVALID_CREDENTIALS = "invalid_credentials",

    // Generic Errors
    CLIENT_ERROR = "client_error",
    SERVER_ERROR = "server_error",

    NOT_FOUND = "not_found",
    INVALID_CSV = "invalid_csv"
}

const messages = {
    [ErrorCode.INVALID_CREDENTIALS]: "Username or password incorrect."
};

const statusCodes = {
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.INVALID_SESSION]: 401,
    [ErrorCode.SESSION_EXPIRED]: 401,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.DEPRECATED_API_VERSION]: 406
};

export class Err extends Error {
    report = false;
    display = false;
    status = 500;

    constructor(
        public code: ErrorCode,
        message?: string,
        opts: { report?: boolean; display?: boolean; status?: number } = {}
    ) {
        super(message || messages[code] || "");
        this.status = opts.status || statusCodes[code] || 500;
        this.report = opts.report || false;
        this.display = opts.report || false;
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
