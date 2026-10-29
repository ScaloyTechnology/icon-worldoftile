import type { CSSProperties } from "react";
import styles from "./site-loader.module.css";

export type LoaderPhase = "loading" | "leaving" | "hidden";
export const LOADER_EXIT_MS = 800;

/** Critical layout is server-rendered inline; the CSS module adds decoration. */
export function BrandLoader({ phase = "loading", progress, label = "Loading ICON website", trackLifecycle = true, message, onRetry }: Readonly<{
  phase?: LoaderPhase;
  progress?: number;
  label?: string;
  trackLifecycle?: boolean;
  message?: string;
  onRetry?: () => void;
}>) {
  const percentage = progress === undefined ? undefined : Math.round(Math.max(0, Math.min(100, progress)));
  return <>
    <div
      className={`site-loader-shell ${styles.loader}`}
      data-site-loader={trackLifecycle ? "" : undefined}
      data-state={phase}
      data-indeterminate={percentage === undefined ? "true" : undefined}
      aria-hidden={phase === "hidden"}
      style={{
        "--loader-exit-duration": `${LOADER_EXIT_MS}ms`,
        "--loader-gold": "#bca27b",
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: phase === "hidden" ? "none" : "grid",
        placeItems: "center",
        overflow: "hidden",
        isolation: "isolate",
        backgroundColor: "#050505",
        color: "#ece9e4",
        opacity: phase === "loading" ? 1 : 0,
        visibility: phase === "hidden" ? "hidden" : "visible",
        overscrollBehavior: "none",
        touchAction: "none",
      } as CSSProperties}
    >
      <span className={styles.frame} aria-hidden="true" />
      <div className={styles.content} style={{ display: "grid", justifyItems: "center", textAlign: "center", width: "min(27rem, calc(100vw - 4rem))" }}>
        <p className={styles.kicker}>A world of material and space</p>
        <div className={styles.mark} style={{ width: "var(--loader-logo-width, clamp(8rem, 13vw, 11.5rem))", maxWidth: "28svh" }}>
          <img src="/brand/icon-logo-vertical.png" alt="ICON — World of Tile" width={1041} height={1069} data-loader-logo fetchPriority="high" decoding="async" style={{ display: "block", width: "100%", height: "auto", filter: "brightness(0) invert(1)" }} />
        </div>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.signature}>Surfaces of <em>character.</em></p>
        <div className={styles.status} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
          <div className={styles.statusLine} aria-hidden="true">
            <span>{phase === "loading" ? "Preparing the experience" : "Experience ready"}</span>
            <span className={styles.percentage}>{percentage === undefined ? "—" : `${String(percentage).padStart(2, "0")}%`}</span>
          </div>
          <span className={styles.track} aria-hidden="true"><span style={{ transform: `scaleX(${(percentage ?? 25) / 100})` }} /></span>
        </div>
        {message && <div className={styles.feedback} role="status">
          <p>{message}</p>
          {onRetry && <button type="button" onClick={onRetry}>Reload page</button>}
        </div>}
      </div>
      <span className={styles.edition} aria-hidden="true">Material. Space. Character.</span>
    </div>
    <noscript><style>{`.site-loader-shell{display:none!important}`}</style></noscript>
  </>;
}
