export const e2eEnv = {
    password: process.env.E2E_PASSWORD || "password",
    name: process.env.E2E_NAME || "The Dude",
    // Defaults match scripts/e2e.sh dedicated ports (avoid host :3000/:8080 clashes)
    serverUrl: process.env.E2E_SERVER_URL || "http://localhost:13000",
    maildevUrl: process.env.E2E_MAILDEV_URL || "http://localhost:1080",
    baseURL: process.env.E2E_BASE_URL || "http://localhost:18080",
};
