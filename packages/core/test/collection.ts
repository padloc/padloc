import { VaultItemCollection } from "../src/collection";
import { VaultItem } from "../src/item";
import { wait } from "../src/util";
import { assert } from "chai";
import { suite, test } from "mocha";

suite("Collection", () => {
    const coll1 = new VaultItemCollection();
    const coll2 = new VaultItemCollection();

    function merge() {
        coll2.clearChanges();
        coll1.merge(coll2);
        coll1.clearChanges();
        coll2.merge(coll1);
    }

    test("add item", () => {
        coll1.update(new VaultItem({ id: "1", name: "Item 1" }));
        coll2.update(new VaultItem({ id: "2", name: "Item 2" }));

        merge();

        assert.equal(coll1.size, 2);
        assert.equal(coll2.size, 2);
        assert.isNotNull(coll2.get("1"));
        assert.isNotNull(coll1.get("2"));
        assert.equal(coll1.get("2")!.name, "Item 2");
        assert.equal(coll2.get("1")!.name, "Item 1");
    });

    test("update item", async () => {
        await wait(10);

        const item = coll1.get("1")!;
        item.name = "Edited Item 1";

        coll1.update(item);

        merge();

        assert.equal(coll2.get("1")!.name, "Edited Item 1");
    });

    test("remove item", () => {
        coll2.remove(coll2.get("1")!);

        merge();

        assert.equal(coll1.size, 1);
        assert.equal(coll2.size, 1);
        assert.isNull(coll1.get("1"));
    });

    test("simultaneous edit", async () => {
        const item1 = coll1.get("2")!;
        item1.name = "Edited First";
        const item2 = coll2.get("2")!;
        item2.name = "Edited Second";
        coll1.update(item1);
        await wait(10);
        coll2.update(item2);

        merge();

        assert.equal(coll1.get("2")!.name, "Edited Second");
        assert.equal(coll2.get("2")!.name, "Edited Second");
    });

    test("simultaneous edit and remove", async () => {
        const item = coll1.get("2")!;
        item.name = "Edited Again";
        coll1.update(item);
        await wait(10);
        coll2.remove(coll2.get("2")!);

        merge();

        assert.isNotNull(coll2.get("2"));
        assert.equal(coll2.get("2")!.name, "Edited Again");
    });

    // test("simultaneous edit and remove", async () => {
    //     coll1.update({ ...coll1.get("2")!, name: "Edited Again" });
    //     await wait(10);
    //     coll2.remove(coll2.get("2")!);
    //
    //     merge();
    //
    //     assert.isNotNull(coll2.get("2"));
    //     assert.equal(coll2.get("2")!.name, "Edited Again");
    // });
});
