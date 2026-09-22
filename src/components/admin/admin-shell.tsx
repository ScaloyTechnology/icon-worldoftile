"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./admin-shell.module.css";

const navigation = [{ label: "Home", href: "/admin" }] as const;

export function AdminShell({ adminName, role, children }: Readonly<{ adminName: string; role: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = pathname === "/admin" ? "Home" : "Content studio";

  return <div className={styles.shell}>
    <button className={styles.mobileToggle} type="button" aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span /><span /><span /><span className={styles.mobileLabel}>Menu</span>
    </button>
    <button className={`${styles.scrim} ${open ? styles.scrimVisible : ""}`} aria-label="Close navigation" tabIndex={open ? 0 : -1} type="button" onClick={() => setOpen(false)} />

    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`} id="admin-navigation">
      <div className={styles.brand}>
        <Image alt="ICON — World of Tile" height={894} src="/brand/icon-logo-horizontal.png" width={2060} />
        <span>Admin</span>
      </div>
      <nav aria-label="Admin navigation">
        <section className={styles.navGroup}>
          <p>Workspace</p>
          {navigation.map((item) => <Link aria-current={pathname === item.href ? "page" : undefined} href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></Link>)}
        </section>
      </nav>
      <div className={styles.sidebarFooter}>
        <Link href="/" target="_blank" rel="noreferrer">View website <span aria-hidden="true">↗</span></Link>
        <form action="/api/admin/logout" method="post"><button type="submit">Sign out</button></form>
      </div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div><span>ICON / Content studio</span><strong>{pageTitle}</strong></div>
        <div className={styles.account}><span>{adminName}</span><small>{role.replaceAll("_", " ")}</small></div>
      </header>
      {children}
    </div>
  </div>;
}
