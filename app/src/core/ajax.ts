export class AjaxError {

    public code: string;

    public message: string;

    constructor(
        public request: XMLHttpRequest
    ) {
        try {
            const err = JSON.parse(request.responseText);
            this.code = err.error;
            this.message = err.message;
        } catch (e) {
            switch (request.status.toString()[0]) {
            case "0":
                this.code = "failed_connection";
                this.message = "Failed Connection";
                break;
            case "3":
                this.code = "unexpected_redirect";
                this.message = "Unexpected Redirect";
                break;
            case "4":
                this.code = "client_error";
                this.message = "Unknown Client Error";
                break;
            default:
                this.code = "server_error";
                this.message = "Server Error";
            }
        }
    };
}

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export function request(method: Method, url: string, body?: string, headers?: Map<string, string>): Promise<XMLHttpRequest> {
    let req = new XMLHttpRequest();

    return new Promise<XMLHttpRequest>((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status.toString()[0] !== "2") {
                    reject(new AjaxError(req));
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
            reject(new AjaxError(req));
        }
    });
}

export interface Client {
    request(method: Method, url: string, body?: string, headers?: Map<string, string>): Promise<XMLHttpRequest>
    urlForPath(path: string): string
}
