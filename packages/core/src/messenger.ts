export interface Message {
    title: string;
    text: string;
    html: string;
}

export interface Messenger {
    send(addr: string, msg: Message): Promise<void>;
}
