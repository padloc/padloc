/**
 * Module for importing data from various formats.
 */
define(["padlock/crypto"], function(crypto) {

    /**
     * Decrypts a SecuStore backup and converts it into a Padlock-compatible array of records
     * @param  {String}   rawData  Raw backup string
     * @param  {String}   password Password to be used for decryption
     * @return {Array}             A list of records
     */
    var importSecuStoreBackup = function(rawData, password) {
        var begin = '#begin',
            end = '#end';
        // rawData = tData;
        
        //Get the JSON code for the data
        objJSON = rawData.substring(rawData.indexOf(begin) + begin.length, rawData.indexOf(end));
        
        try {
            // Try to parse JSON object containing data needed for decryption
            var obj = JSON.parse(objJSON);

            // Create a crypto container and initialize it with the parameters from the
            // obtained object
            var cont = crypto.initContainer();
            cont.salt = obj.salt;
            cont.iv = obj.data.iv;
            cont.ct = obj.data.ct;
            cont.adata = unescape(obj.data.adata);

            // Decrypt data and parse the resulting JSON
            var data = JSON.parse(crypto.pwdDecrypt(password, cont));

            // Convert the _items_ array of the SecuStore Set object into an array of Padlock records
            var records = data.items.map(function(item) {
                var fields = item.template.containsPassword ?
                    // Passwords are a separate property in SecuStore but will be treated as
                    // regular fields in Padlock
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