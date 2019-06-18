interface Navigator {
    Backbutton: any
}

interface Window {
    env: {
        clientUrl: string;
        serverUrl: string;
        stripePubKey: string;
    },
    app: any;
    router: any;
}
