/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import { assert } from "chai";
import * as imp from "../app/src/core/import";
import { Record } from "../app/src/core/data";

suite("import", () => {
    function compareRecords(actual: Record[], expected: Record[]) {
        assert.equal(actual.length, expected.length);

        for (let i=0; i<expected.length; i++) {
            assert.equal(actual[i].name, expected[i].name);
            assert.equal(actual[i].category, expected[i].category);
            assert.deepEqual(actual[i].fields, expected[i].fields);
        }
    }

    test("from CSV", () => {
        const data = 'name,category,field1,field2\r\n' +
            'name1,category1,value1,\r\n' +
            'name2,category2,value2,"multiline\nvalue"';
        const expected = [
            new Record("name1", [
                { name: "field1", value: "value1" }
            ], "category1"),
            new Record("name2", [
                { name: "field1", value: "value2" },
                { name: "field2", value: "multiline\nvalue" }
            ], "category2")
        ];

        const records = imp.fromCSV(data, 0, 1);
        compareRecords(records, expected);
    });

    test("from SecuStore", () => {
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
        ].map(Record.fromRaw);

        assert(imp.isFromSecuStore(data));

        const records = imp.fromSecuStore(data, password);
        compareRecords(records, expected);
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
        ].map(Record.fromRaw);

        assert(imp.isFromLastPass(data));

        const records = imp.fromLastPass(data);

        compareRecords(records, expected);
    });

    test("from Padlock", () => {
        const data = `{"adata":"o85jAehnFjbW+9lkcGkhiQ==","cipher":"AES","ct":"1NFGbGobAMRoigGTC9wAEoTPiLvN633HQC1zO3MHr8Gh7mo/clInWxsp7WS3r7f1Djwkyjm7l2Z3LUzPqGGP3FJa936dBRJT1lTGyGLanvt0UJUvB8aft5onINaEOb5Js3eqqEet2ZoVauhk4xq/gJwWYGGW3yd2BQCynPJ7oQp7wiS2YKj5/4Httymba+VGZ2BT9F8bQWwT70Ozudw+XJoju5TR6uJgfHHqNcv9EzIMemccKW2KyU81u4cNVKXfmpyCbrjDVjUBcZiMSTEjL2kffbWGsonT3W3NbtJXyzT1sNK2DMJKaIvldp4mJeSYhW3gsG202HjD4D9x2J7msYSNs6+MRDABSp5WVeSStNu9/ut5xDYSNO8OxDafjPcwnFTrdSbZStbnkCEA4GUDRtwD+NsaLbphQoqjv/DAJG5tG7qEADOHyySL6ErXGHooBOPyqEVA/7ffNf905tpCgRya6r5Fb8HZPOQ0XJAqEIBMUeeZVLvh/ShzdFvFh7YP4tQtaUR1XN4=","iter":10000,"iv":"GJyHEBL515SEBPzFERloeQ==","keySize":256,"mode":"ccm","salt":"mhw9R9OBEZZwocNkkPxXlg==","ts":64}`;

        const expected = [
            {name: "record1", category: "category1", fields: [
                { name: "username", value: "username1" },
                { name: "password", value: "password1" }
            ]},
            {name: "record2", category: "", fields: [
                { name: "password", value: "password2" }
            ]}
        ].map(Record.fromRaw);

        assert(imp.isFromPadlock(data));

        const records = imp.fromPadlock(data, "password");

        compareRecords(records, expected);
    });

});
