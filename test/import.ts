/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import * as imp from "../app/src/core/import";

suite("import", () => {

    test("from SecuStore", function() {
        const data = `
----- backup for set "Import Test" on Wed Jan 22 2014 (SecuStore 2; Version: 1.6.6) -----
#begin{"version":"1.6.6","keyDerivation":"pbkdf2","keySize":256,"salt":"ZjkLL7VYThHlHLFMyqHqTQ==","iterations":1000,"data":{"iv":"NzR33YXceGbLYbKKoEe7Eg","cipher":"AES","mode":"CCM","ct":"O1paNGVr8PJA8HsNgLSni3+87QSA5hDw0F7w7TYhrKifyLx5Zxb4L/ncaGzOsxPZ3nKdBpWZ/GLMwdSWRuSGzKqNtjY42YrW319Lk2wUqu8n+lgh5dV7BvSqRfws8nwoWFjI1FFKqo9X4MdSuHm4AtW07U3PpuysjRolT5XOMLiAD+2mOkwSxbRee3lcvY89p+K6J6WNKmFQWcDUVu3JVnPxsx+sHH0j1gbbUZ23NdkzNsTxjsTeZCLi0xIK+/TywfdjVShAYiZyyU4oWCfy2BG3Gm5Dhz8U6ifIWf+xppdhZckd+wyjKYdwh3qrbzletnEl8nvbU+BvKDu+tV7kXGxpg+ABJtiADnvMkk9lBjw5yq6Fyo6NMLH/QbI2WzGIY3suyTDDIA25VZRPHEq5qSfahUebDDNwfNQb/Ej8AzNF1WuUv5dziJ2n9Du7vgzHT23CJZvNkplRaBKHjIJPl+SFoo9xIf8W/nXa3KZ0IM8B99djaBoC2k+BqZiJPVxXcbM/YgFs36wH5LvzriSwGCcVrA53eblQeTEfCJrPTMU/juYM9IFZ9+JDGw3nbS3MElJX5Csf+s9NlAFQfOdERdILNezcTSX0aM7Dv4uVcG7gjsyMF3aUYvd1G2J1pnuVPd0QDw9d3zgtAITIdgYfVoeotbqMiIk4WWqlQR4gTrHdbVsxKSVOhD25bkhlplhNwsrMhd/tfayOBGlhrUTzSjhfDnQbvsxzAZns40Yi5stuUJ8nX0RUPb7eejIHEVddZxdAo2yV12q7xRn7fNPib9mXxioRjmNOvvBtjWp3TaSrDsvcK/nygW3V9qNTXGq3AP8hrGhQ45kraMB68Z6KZOKLyDztKkEYh2Pp/B8ZPbHLJ9xqUW5dLpN3z8jUq3Oo1/QQVYV5gfZx5aanfTaMlB4BDNDGA9qQtauKDO6Ejrxl08wNqtjyv4oReu9KuF2MwmzDlheRCUY69Mc9vxdnfXz2DSRtHqIZRR2VBRLy32BCnp1RbDHONT+1AcgXgG0hUzqOAMEuJOCwmjFvJj7v0iJGYjW0fkLNgk/kz5hgYjPN031aUAcgfYCC8v6lSzkkXcQaUHnXBNGA5LpbyTExDVMcf0CrF4NVzvuLp6gXxCNtX6356nWzF89qtH3aDwvbeIFHbl5kn99/Ox91b+owcg6AipIOzpnfDCR7E+J54aOO0Dz5uMKbWqPEm4TJZLIebEpmMmHnJNFxVqMkhRWKX8QFKoNZtG3ZT5+FTk5vdLO8n5+u4IIIgCRKEfhcj5RnWYa9KG9jdh4A8+R5KofO16CzIpGxgAjqxua3Qd40CpQjYtTsmDTd9g/rVKABEWKlEdVbvZsl5NFnrbfcbW+Wcxy9+44YplDVfxdFmNxMQZfoDpKEXF/syn5UVo3NRnEL2m4FJnxLEzzNuITNb+cDxojgQTSLEj2UIOlsKl+WVJQv//NuetJ1AYHwJuQrOjC56hOYetXFzK8TI4XSfNZXIduCgQGexYESJYCwRyCuwjLX40t5hyA","adata":"Import%20Test","ts":64}}#end
        `;
        const password = "password";
        const expected = [
            {name: "My Record", category: "Import Test", fields: [
                {name: "My field", value: "some value"}
            ]},
            {name: "Website", category: "Import Test", fields: [
                {name: "url", value: "http://test.org"},
                {name: "login name", value: "username"},
                {name: "password", value: "password"}
            ]}
        ];

        assert(imp.isFromSecuStore(data));

        const records = imp.fromSecuStore(data, password);
        assert.equal(records.length, expected.length);

        for (let i=0; i<expected.length; i++) {
            assert.equal(records[i].name, expected[i].name);
            assert.equal(records[i].category, expected[i].category);
            assert.deepEqual(records[i].fields, expected[i].fields);
        }
    });

    test("from LastPass", () => {
        const data = `url,username,password,extra,name,grouping,fav
http://example.com,username1,password1,notes1,name1,category1,0
http://sn,username2,password2,"NoteType:test
field1:value1
field2:value2",name2,category2,0`;
        const expected = [
            { name: "name1", category: "category1", fields: [
                { name: "url", value: "http://example.com" },
                { name: "username", value: "username1" },
                { name: "password", value: "password1" },
                { name: "notes", value: "notes1" }
            ] },
            { name: "name2", category: "category2", fields: [
                { name: "username", value: "username2" },
                { name: "password", value: "password2" },
                { name: "field1", value: "value1" },
                { name: "field2", value: "value2" }
            ] }
        ];

        assert(imp.isFromLastPass(data));

        const records = imp.fromLastPass(data);
        assert.equal(records.length, expected.length);

        for (let i=0; i<expected.length; i++) {
            assert.equal(records[i].name, expected[i].name);
            assert.equal(records[i].category, expected[i].category);
            assert.deepEqual(records[i].fields, expected[i].fields);
        }
    });

});
