import "server-only";
export interface EmailMessage { to: string; subject: string; text: string; html?: string; replyTo?: string }
export interface EmailProvider { send(message: EmailMessage): Promise<{ id: string }> }

function configuredValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getEmailProvider(): EmailProvider {
  const provider = configuredValue("EMAIL_PROVIDER").toLowerCase();
  const apiKey = configuredValue("EMAIL_API_KEY");
  const from = configuredValue("EMAIL_FROM");

  if (provider !== "resend" || !apiKey || !from) {
    return { async send() { throw new Error("Email provider has not been configured"); } };
  }

  return {
    async send(message) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "The email provider rejected the message.";
        throw new Error(detail);
      }
      if (typeof payload !== "object" || payload === null || !("id" in payload) || typeof payload.id !== "string") {
        throw new Error("The email provider returned an incomplete response.");
      }
      return { id: payload.id };
    },
  };
}
