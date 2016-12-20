export class AjaxError {
    constructor(
        public code:
            "failed_connection" |
            "unexpected_redirect" |
            "client_error" |
            "server_error",
        public request: XMLHttpRequest
    ) {};
}

export type Method = "GET" | "POST" | "PUT" | "DELETE";

function errorFromRequest(req: XMLHttpRequest): AjaxError | null {
    switch (req.status.toString()[0]) {
    case "0":
        return new AjaxError("failed_connection", req);
    case "3":
        return new AjaxError("unexpected_redirect", req);
    case "4":
        return new AjaxError("client_error", req);
    case "5":
        return new AjaxError("server_error", req);
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
            reject(new AjaxError("failed_connection", req));
        }
    });
}
