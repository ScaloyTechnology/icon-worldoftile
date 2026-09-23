"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

type AdminSuccessToastProps = Readonly<{
  title: string;
  detail: string;
  className?: string;
  returnHref?: string;
}>;

export function AdminSuccessToast({ title, detail, className, returnHref = "/admin" }: AdminSuccessToastProps) {
  const router = useRouter();
  const dismiss = useCallback(() => router.replace(returnHref, { scroll: false }), [returnHref, router]);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  return <div className={className} role="status" aria-live="polite">
    <span><strong>{title}</strong><small>{detail}</small></span>
    <button aria-label="Dismiss success message" onClick={dismiss} type="button">&times;</button>
  </div>;
}
