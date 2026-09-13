"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Sign-in failed.");
      else { router.replace("/admin"); router.refresh(); }
    } catch { setError("Could not connect. Please try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="login-form" aria-busy={pending}>
    <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" maxLength={254} required /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} required /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!configured && <p className="form-error" role="status">The administrator database needs to be configured before sign-in is available.</p>}
    <button className="button" disabled={pending || !configured}>{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
