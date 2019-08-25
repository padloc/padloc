import { Collection, CollectionItem } from "../src/collection";
import { wait } from "../src/util";
import { assert } from "chai";
import { suite, test } from "mocha";

interface TestItem extends CollectionItem {
    value: string;
}

suite("Collection", () => {
    const coll1 = new Collection<TestItem>();
    const coll2 = new Collection<TestItem>();

    function merge() {
        coll1.merge(coll2);
        coll2.merge(coll1);
    }

    test("add item", () => {
        coll1.update({ id: "1", value: "Item 1" });
        coll2.update({ id: "2", value: "Item 2" });

        merge();

        assert.equal(coll1.size, 2);
        assert.equal(coll2.size, 2);
        assert.isNotNull(coll2.get("1"));
        assert.isNotNull(coll1.get("2"));
        assert.equal(coll1.get("2")!.value, "Item 2");
        assert.equal(coll2.get("1")!.value, "Item 1");
    });

    test("update item", async () => {
        await wait(10);

        coll1.update({ ...coll1.get("1")!, value: "Edited Item 1" });

        merge();

        assert.equal(coll2.get("1")!.value, "Edited Item 1");
    });

    test("remove item", () => {
        coll2.remove(coll2.get("1")!);

        merge();

        assert.equal(coll1.size, 1);
        assert.equal(coll2.size, 1);
        assert.isNull(coll1.get("1"));
    });

    test("simultaneous edit", async () => {
        coll1.update({ ...coll1.get("2")!, value: "Edited First" });
        await wait(10);
        coll2.update({ ...coll2.get("2")!, value: "Edited Second" });

        merge();

        assert.equal(coll1.get("2")!.value, "Edited Second");
        assert.equal(coll2.get("2")!.value, "Edited Second");
    });

    test("simultaneous edit and remove", async () => {
        coll1.update({ ...coll1.get("2")!, value: "Edited Again" });
        await wait(10);
        coll2.remove(coll2.get("2")!);

        merge();

        assert.isNotNull(coll2.get("2"));
        assert.equal(coll2.get("2")!.value, "Edited Again");
    });
});
