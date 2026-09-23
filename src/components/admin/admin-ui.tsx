import type { ReactNode } from "react";

import { AdminIcon } from "./admin-icons";
import styles from "./admin-ui.module.css";

export { AdminActionMenu } from "./admin-action-menu";

export function AdminPageHeader({ action, description, eyebrow, title }: Readonly<{ action?: ReactNode; description: string; eyebrow?: string; title: string }>) {
  return <header className={styles.pageHeader}>
    <div>{eyebrow ? <p>{eyebrow}</p> : null}<h1>{title}</h1><span>{description}</span></div>
    {action ? <div className={styles.pageAction}>{action}</div> : null}
  </header>;
}

export function AdminBadge({ children, tone = "neutral" }: Readonly<{ children: ReactNode; tone?: "danger" | "neutral" | "success" | "warning" }>) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

export function AdminEmptyState({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return <div className={styles.empty}><span>ICON</span><strong>{title}</strong><p>{children}</p></div>;
}

export function AdminTableShell({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.tableShell}>{children}</div>;
}

export function AdminSearch({ defaultValue, label, placeholder }: Readonly<{ defaultValue?: string; label: string; placeholder: string }>) {
  return <label className={styles.search}><AdminIcon name="search" /><input aria-label={label} defaultValue={defaultValue} name="q" placeholder={placeholder} /></label>;
}

export function AdminFilter({ children, defaultValue, label, name }: Readonly<{ children: ReactNode; defaultValue?: string; label: string; name: string }>) {
  return <select aria-label={label} defaultValue={defaultValue} name={name}>{children}</select>;
}
