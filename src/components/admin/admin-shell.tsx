"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./admin-shell.module.css";

const navigation = [
  { label: "Workspace", items: [{ label: "Home", href: "/admin" }] },
  { label: "Products", items: [{ label: "All products", href: "/admin/products" }, { label: "Add product", href: "/admin/products/new" }] },
] as const;

export function AdminShell({ adminName, role, children }: Readonly<{ adminName: string; role: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = navigation.flatMap((group) => group.items).find((item) => item.href === pathname)?.label ?? "Products";

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
        {navigation.map((group) => <section className={styles.navGroup} key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => <Link aria-current={pathname === item.href || (item.href === "/admin/products" && pathname.startsWith("/admin/products/") && pathname !== "/admin/products/new") ? "page" : undefined} href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></Link>)}
        </section>)}
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
