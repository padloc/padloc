import { Source } from "./source";
import { Container, clearKeyCache } from "./crypto";

export class Store {

    containers: Map<Source, Container>;
    passwords: Map<Source, string>;

    constructor(public defaultSource: Source) {
        this.containers = new Map<Source, Container>();
        this.passwords = new Map<Source, string>();
    }

    get(password?: string, rememberPassword = false, source?: Source): Promise<string> {
        const src: Source = source || this.defaultSource;
        const pwd: string = password || this.passwords.get(src) || "";

        // Remember password so the user does not have to reenter it every time we set changes
        if (rememberPassword) {
            this.passwords.set(src, pwd);
        }

        return src.get()
            .then((data) => {
                if (data == "") {
                    return "";
                }

                let cont = Container.fromJSON(data);

                // Save container for later; we'll need to remember the encryption parameters in order
                // to set to the same source
                this.containers.set(src, cont);

                return cont.getData(pwd);
            });
    }

    set(data: string, password?: string, rememberPassword = false, source?: Source): Promise<void> {
        const src: Source = source || this.defaultSource;
        const pwd: string = password || this.passwords.get(src) || "";

        // Reuse container if possible
        let cont = this.containers.get(src) || new Container();

        // Remember password so the user does not have to reenter it every time we set changes
        if (rememberPassword) {
            this.passwords.set(src, pwd);
        }

        cont.setData(pwd, data);

        return src.set(cont.toJSON());
    }

    clear(source?: Source): Promise<void> {
        this.passwords.clear();
        this.containers.clear();
        clearKeyCache();
        source = source || this.defaultSource;
        return source.clear();
    }

    isEmpty(source?: Source): Promise<boolean> {
        source = source || this.defaultSource;
        return source.get().then(data => !data);
    }

}
