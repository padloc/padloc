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
            ];

        expect(1);

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4) {
                imp.importSecuStoreBackup(xmlhttp.responseText, password, function(data) {
                    deepEqual(data, expected, "Imported records did not match the exptected data");
                    start();
                });
            }
        };
        xmlhttp.open("GET", sample, true);
        xmlhttp.send();
    });
})(padlock.import);