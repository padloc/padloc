/**
 * A message to be sent to a Padloc user
 */
export interface Message {
    /** Message title */
    title: string;

    /** Message body, in plain text */
    text: string;

    /** Message body, formated as html */
    html: string;
}

/**
 * Generic interface for sending messages to Padloc users
 */
export interface Messenger {
    /**
     * Sends a message to a given address
     */
    send(addr: string, msg: Message): Promise<void>;
}

/**
 * Stub implementation of the [[Messenger]] interface.  Simply stores messages
 * in memory. Useful for testing purposes.
 */
export class StubMessenger implements Messenger {
    /**
     * An array of messages passed to the [[send]] method. Sorted from
     * most recent to oldest.
     */
    messages: { recipient: string; message: Message }[] = [];

    async send(recipient: string, message: Message) {
        this.messages.unshift({ recipient, message });
    }

    /**
     * Returns the most recent message sent to `addr`.
     */
    lastMessage(addr: string): Message | null {
        const msg = this.messages.find(({ recipient }) => recipient === addr);
        return msg ? msg.message : null;
    }
}
