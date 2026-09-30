"use client";

function payloadError(payload: unknown) {
  return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
    ? payload.error.trim()
    : "";
}

function statusError(status: number, fallback: string) {
  if (status === 401) return "Your admin session has expired. Sign in again, then retry this action.";
  if (status === 403) return "This request was blocked by the server security check. Refresh the page and try again.";
  if (status === 413) return "The live server rejected this file because it is too large. Choose a smaller file or increase Nginx client_max_body_size.";
  if (status === 415) return "This file type is not supported. Choose one of the formats listed beside the field.";
  if (status === 429) return "Too many requests were sent. Wait a moment, then try again.";
  if (status >= 500) return `${fallback} The server reported an internal or storage error.`;
  return `${fallback} The server returned status ${status}.`;
}

export async function readAdminApiResponse(response: Response, fallback: string): Promise<unknown> {
  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = null; }
  }

  if (!response.ok) throw new Error(payloadError(payload) || statusError(response.status, fallback));
  if (payload === null) throw new Error(`${fallback} The server returned an empty or invalid response.`);
  return payload;
}

export function adminRequestError(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message.trim()) {
    if (cause instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(cause.message)) {
      return `${fallback} The live server could not be reached. Check the connection and try again.`;
    }
    return cause.message;
  }
  return fallback;
}
