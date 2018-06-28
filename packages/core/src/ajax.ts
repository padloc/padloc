import { errFromRequest } from "./error";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function request(
    method: Method,
    url: string,
    body?: string,
    headers?: Map<string, string>
): Promise<XMLHttpRequest> {
    let req = new XMLHttpRequest();

    return new Promise<XMLHttpRequest>((resolve, reject) => {
        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                if (req.status.toString()[0] !== "2") {
                    reject(errFromRequest(req));
                } else {
                    resolve(req);
                }
            }
        };

        try {
            req.open(method, url, true);
            if (headers) {
                headers.forEach((value, key) => req.setRequestHeader(key, value));
            }
            req.send(body);
        } catch (e) {
            throw errFromRequest(req);
        }
    });
}
