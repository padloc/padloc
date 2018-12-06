import "chai";

export type Spec = (test: (name: string, fn: () => Promise<void>) => void, assert: Chai.Assert) => void;
