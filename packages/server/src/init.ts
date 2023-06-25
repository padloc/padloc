import { NodeServerRuntime } from "./runtime";

async function start() {
    await new NodeServerRuntime().startServer();
}

start();
