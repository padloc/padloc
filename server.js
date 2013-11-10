var connect = require('connect');
connect.createServer(
    connect.static(process.argv[2] || __dirname)
).listen(process.argv[3] || 8080);