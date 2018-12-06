export interface Message {
    title: string;
    text: string;
    html: string;
}

export interface Messenger {
    send(addr: string, msg: Message): Promise<void>;
}

export class StubMessenger implements Messenger {
    messages: { recipient: string; message: Message }[] = [];

    async send(recipient: string, message: Message) {
        this.messages.unshift({ recipient, message });
    }

    lastMessage(addr: string): Message | null {
        const msg = this.messages.find(({ recipient }) => recipient === addr);
        return msg ? msg.message : null;
    }
}
