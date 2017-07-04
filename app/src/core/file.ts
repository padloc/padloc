const persistentStorage =  navigator.persistentStorage || navigator.webkitPersistentStorage;

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

export interface FileManager {
    read(path: string): Promise<string>
    write(path: string, content: string): Promise<void>
}

export class HTML5FileManager {

    protected get fs(): Promise<any> {
        return requestQuota(1024 * 1024 * 10)
            .then((grantedBytes) => requestFileSystem(grantedBytes));
    };

    async getFile(name: string): Promise<any> {
        const fs = await this.fs;

        return new Promise<any>((resolve, reject) => {
            fs.root.getFile(name, { create: true, exclusive: false }, resolve, reject);
        });

    }

    async read(name: string): Promise<string> {
        const fileEntry = await this.getFile(name);

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

    async write(name: string, content: string): Promise<void> {
        const fileEntry = await this.getFile(name);

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
}

const cordovaReady = new Promise<void>((resolve) => {
    document.addEventListener("deviceready", () => resolve());
});

export class CordovaFileManager extends HTML5FileManager {
    protected get fs(): Promise<any> {
        return cordovaReady.then(() => requestFileSystem(0));
    }
}
