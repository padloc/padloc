(function(imp) {
    module("padlock/import");

    asyncTest("import secustore set", function() {
        var sample = "secustore-backup.txt",
            password = "password",
            expected = [
                {name: "My Record", category: "Import Test", fields: [
                    {name: "My field", value: "some value"}
                ]},
                {name: "Website", category: "Import Test", fields: [
                    {name: "url", value: "http://test.org"},
                    {name: "login name", value: "username"},
                    {name: "password", value: "password"}
                ]}
            ],
            collection = new padlock.Collection();

        expect(1);

        imp.importSecuStoreBackup(collection, secustoreBackup, password, function(data) {
            deepEqual(collection.records, expected, "Imported records did not match the exptected data");
            start();
        }, function(e) {
            console.error(e);
            ok(false, "Import failed");
            start();
        });
    });
})(padlock.import);
