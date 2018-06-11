export type Base64String = string;

export interface Marshalable {}

export interface Serializable {
    serialize: () => Promise<Marshalable>;
    deserialize: (data: Marshalable) => Promise<void>;
}

export function marshal(obj: Marshalable): string {
    return JSON.stringify(obj);
}

export function unmarshal(str: string): Marshalable {
    return JSON.parse(str);
}
