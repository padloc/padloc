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
        // Use password argument if provided, otherwise use the password stored in the source object
        password = password || this.passwords.get(source);

        // Remember password so the user does not have to reenter it every time we set changes
        if (rememberPassword) {
            this.passwords.set(source, password);
        }

        source = source || this.defaultSource;
        return source.get()
            .then((data) => {
                if (data == "") {
                    return "";
                }

                let cont = Container.fromJSON(data);

                // Save container for later; we'll need to remember the encryption parameters in order
                // to set to the same source
                this.containers.set(source, cont);

                return cont.getData(password);
            });
    }

    set(data: string, password?: string, rememberPassword = false, source?: Source): Promise<void> {

        // Reuse container if possible
        let cont = this.containers.get(source) || new Container();

        // Use password argument if provided, otherwise use the password stored in the source object
        password = password || this.passwords.get(source);

        // Remember password so the user does not have to reenter it every time we set changes
        if (rememberPassword) {
            this.passwords.set(source, password);
        }

        cont.setData(password, data);

        source = source || this.defaultSource;
        return source.set(cont.toJSON());
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
