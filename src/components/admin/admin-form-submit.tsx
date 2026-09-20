"use client";

import { useFormStatus } from "react-dom";

export function AdminFormSubmit({ label, className }: Readonly<{ label: string; className: string }>) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Saving…" : label}<span aria-hidden="true">↗</span></button>;
}
