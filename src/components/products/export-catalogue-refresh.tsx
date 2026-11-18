"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Reconcile an older browser snapshot when returning from admin or history. */
export function ExportCatalogueRefresh() {
  const router = useRouter();
  const lastRequest = useRef(0);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible"
        || now - lastRequest.current < 2000) return;
      lastRequest.current = now;
      // Refresh the server props while retaining the current search and scroll.
      router.refresh();
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", restore);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", restore);
      document.removeEventListener("visibilitychange", refresh);
    };
    // Do not depend on catalogue props: receiving refreshed server data must
    // not start another request. The time guard also coalesces focus events.
  }, [router]);

  return null;
}
