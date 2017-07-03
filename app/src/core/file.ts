import { isCordova } from "./platform";

const persistentStorage =  navigator.persistentStorage || navigator.webkitPersistentStorage;
const requestedBytes = 1024 * 1024 * 10; // 10MB

const ready = isCordova() ? new Promise<void>((resolve) => {
    document.addEventListener("deviceready", () => resolve());
}) : Promise.resolve();

function requestFileSystem(bytes: number): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        const request = window.requestFileSystem || window.webkitRequestFileSystem;
        request(window.PERSISTENT, bytes, resolve, reject);
    });
}

async function requestQuota(requestedBytes: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        if (persistentStorage) {
            persistentStorage.requestQuota(requestedBytes, resolve, reject);
        } else {
            resolve(requestedBytes);
        }
    });
}

async function getFs(): Promise<any> {
    await ready;
    const grantedBytes = await requestQuota(requestedBytes);
    return requestFileSystem(grantedBytes);
}

async function getFile(name: string): Promise<any> {
    const fs = await getFs();

    return new Promise<any>((resolve, reject) => {
        fs.root.getFile(name, { create: true, exclusive: false }, resolve, reject);
    });

}

export async function readFile(name: string): Promise<string> {
    const fileEntry = await getFile(name);

    return new Promise<string>((resolve, reject) => {
        fileEntry.file(function(file: any) {
            const reader = new FileReader();

            reader.onload = function() {
                resolve(this.result);
            };

            reader.onerror = reject;

            reader.readAsText(file);
        }, reject);
    });
}

export async function writeFile(name: string, content: string): Promise<void> {
    const fileEntry = await getFile(name);

    return new Promise<void>((resolve, reject) => {
        // Create a FileWriter object for our FileEntry (log.txt).
        fileEntry.createWriter(function(fileWriter: any) {

            fileWriter.onerror = reject;

            fileWriter.onwrite = () => {
                const blob = new Blob([content], {type: "text/plain"});
                fileWriter.onwrite = resolve;
                fileWriter.write(blob);
            };

            fileWriter.seek(0);
            fileWriter.truncate(0);

        }, reject);
    });
}
