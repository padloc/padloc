define(["padlock/crypto"], function(crypto) {
    var importSecuStoreBackup = function(rawData, password, callback) {
        var begin = '#begin';
        var end = '#end';
        // rawData = tData;
        
        //Get the JSON code for the data
        objJSON = rawData.substring(rawData.indexOf(begin) + begin.length, rawData.indexOf(end));
        
        try {
            var obj = JSON.parse(objJSON);

            var cont = crypto.initContainer();
            cont.salt = obj.salt;
            cont.iv = obj.data.iv;
            cont.ct = obj.data.ct;
            cont.adata = unescape(obj.data.adata);

            var data = JSON.parse(crypto.pwdDecrypt(password, cont));
            var records = data.items.map(function(item) {
                var fields = item.template.containsPassword ?
                    item.fields.concat([{name: "password", value: item.password}]) : item.fields;

                return {
                    name: item.title,
                    fields: fields
                };
            });

            return records;
        } catch(e) {
            console.error("Failed to restore backup! The data is corrupt or password incorrect!", e);
            return null;
        }
    };

    return {
        importSecuStoreBackup: importSecuStoreBackup
    };
});