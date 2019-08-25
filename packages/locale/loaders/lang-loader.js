const { parse } = require("yaml");

module.exports = function(source) {
    const items = parse(source);

    return `export default ${JSON.stringify(items)}`;
};
