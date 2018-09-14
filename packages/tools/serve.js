const stat = require("node-static");
const http = require("http");

const fileServer = new stat.Server("./");

http.createServer(function(request, response) {
    request
        .addListener("end", function() {
            fileServer.serve(request, response, function(e) {
                if (e && e.status === 404) {
                    fileServer.serveFile("/index.html", 200, {}, request, response);
                }
            });
        })
        .resume();
}).listen(8080);
