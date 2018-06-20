import * as Application from "koa";
import * as route from "koa-route";
// @ts-ignore
import * as level from "level";
// @ts-ignore
import * as body from "koa-body";
import { marshal, unmarshal } from "./encoding";
import { Storage, Storable } from "./storage";
import { Account, Store } from "./data";

class LevelDBStorage implements Storage {
    private dbs = new Map<string, any>();

    getDB(kind: string): any {
        if (!this.dbs.has(kind)) {
            this.dbs.set(kind, level(`./${kind}.db`));
        }

        return this.dbs.get(kind);
    }

    async get(s: Storable) {
        const db = this.getDB(s.kind);
        const data = await db.get(s.id);
        await s.deserialize(unmarshal(data));
    }

    async set(s: Storable) {
        const db = this.getDB(s.kind);
        const data = await s.serialize();
        await db.put(s.id, marshal(data));
    }

    async clear() {
        throw "not implemented";
    }
}

const app = new Application();
const db = new LevelDBStorage();

app.use(body());

app.use(
    route.get("/account/:id", async (ctx, id) => {
        const account = new Account(id);
        await db.get(account);
        ctx.body = await account.serialize();
    })
);

app.use(
    route.post("/account/", async ctx => {
        const account = await new Account().deserialize(ctx.request.body);
        await db.set(account);
        ctx.body = await account.serialize();
    })
);

app.use(
    route.get("/store/:id", async (ctx, id) => {
        const store = new Store(id);
        await db.get(store);
        ctx.body = marshal(await store.serialize());
    })
);

app.use(
    route.put("/store/:id", async (ctx, id) => {
        const store = new Store(id);
        await store.deserialize(ctx.request.body);
        ctx.body = await store.serialize();
    })
);

app.listen(3000);
