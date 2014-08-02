(function(Collection) {
    module("padlock/Collection");

    test("add records", function() {
        var coll = new Collection();
        var rec = {name: "Hello", value: "World"};
        coll.add(rec);
        equal(coll.records.length, 1);
        equal(coll.records[0], rec);

        var rec2 = {name: "Orang", value: "Utan"}, rec3 = {name: "John", value: "Travolta"};
        coll.add([rec2, rec3]);
        equal(coll.records.length, 3);
        equal(coll.records[1], rec2);
        equal(coll.records[2], rec3);

        ok(!!rec.uuid, "uuid for added record should have been generated");
    });

    test("remove record", function() {
        var coll = new Collection();
        var recs = [];
        for (var i=0; i<10; i++) {
            recs.push({name: "name", value: "value"});
        }
        coll.add(recs);

        var rec = recs[3];

        coll.remove(rec);
        ok(rec.removed, "Removed property should be set to true");
        ok(!rec.name, "Name property should have been removed");
        ok(!rec.fields, "Fields should have been removed");
    });
})(padlock.Collection);