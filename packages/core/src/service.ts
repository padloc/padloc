export interface Service {
    init(): Promise<void>;
    dispose(): Promise<void>;
}

export class SimpleService implements Service {
    async init() {}
    async dispose() {}
}
