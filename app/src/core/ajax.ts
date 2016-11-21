export const ERR_FAILED_CONNECTION = "failed_connection";
export const ERR_UNEXPECTED_REDIRECT = "unexpected_redirect";
export const ERR_UNKNOWN = "unknown_error";

export type Method = "GET" | "POST" | "PUT";

export interface ErrorResponse {
    error: string;
    message?: string;
}

function errorFromRequest(req: XMLHttpRequest): ErrorResponse | null {
    switch (req.status.toString()[0]) {
    case "0":
        return { error: ERR_FAILED_CONNECTION };
    case "3":
        return { error: ERR_UNEXPECTED_REDIRECT };
    case "4", "5":
        try {
            return JSON.parse(req.responseText);
        } catch (e) {
            return {
                error: ERR_UNKNOWN,
                message: req.responseText
            };
        }
    default:
        return null
    }
}

export function request(method: Method, url: string, body?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
    let req = new XMLHttpRequest();

    return new Promise<XMLHttpRequest>((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                const err = errorFromRequest(req);
                if (err) {
                    reject(err);
                } else {
                    resolve(req);
                }
            }
        }

        try {
            req.open(method, url, true);
            if (headers) {
                headers.forEach((value, key) => req.setRequestHeader(key, value));
            }
            req.send(body);

        } catch(e) {
            reject({
                error: ERR_FAILED_CONNECTION,
                message: e.toString()
            });
        }
    });
}
