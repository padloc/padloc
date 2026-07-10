import { e2eEnv } from "./env";

type MaildevEmail = {
    time: string | number;
    text?: string;
    html?: string;
};

export async function clearEmails(): Promise<void> {
    const res = await fetch(`${e2eEnv.maildevUrl}/email/all`, { method: "DELETE" });
    if (!res.ok && res.status !== 200) {
        throw new Error(`maildev clear failed: ${res.status}`);
    }
}

export async function getCodeFromEmail(options: { timeout?: number } = {}): Promise<string> {
    const timeout = options.timeout ?? 30_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
        const res = await fetch(`${e2eEnv.maildevUrl}/email`);
        if (res.ok) {
            const emails = (await res.json()) as MaildevEmail[];
            const latest = [...emails].sort((a, b) => (a.time > b.time ? -1 : 1))[0];
            const body = `${latest?.text || ""}\n${latest?.html || ""}`;
            const match = body.match(/(\d{6})/);
            if (match?.[1]) {
                return match[1];
            }
        }
        await new Promise((r) => setTimeout(r, 500));
    }

    throw new Error("Timed out waiting for email verification code from maildev");
}
