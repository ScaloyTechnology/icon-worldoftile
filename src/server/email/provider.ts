import "server-only";
export interface EmailMessage { to: string; subject: string; text: string }
export interface EmailProvider { send(message: EmailMessage): Promise<{ id: string }> }
/** No fake delivery acknowledgement. Configure a real adapter when enquiry flows are built. */
export function getEmailProvider(): EmailProvider { return { async send() { throw new Error("Email provider has not been configured"); } }; }
