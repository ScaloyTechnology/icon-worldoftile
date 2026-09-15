"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./admin-shell.module.css";

type NavigationItem = Readonly<{ label: string; href: string }>;
type NavigationGroup = Readonly<{ label: string; items: readonly NavigationItem[] }>;

const navigation: readonly NavigationGroup[] = [
  { label: "Workspace", items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  { label: "Products", items: [
    { label: "All products", href: "/admin/products" },
    { label: "Add product", href: "/admin/products/new" },
    { label: "Categories", href: "/admin/categories" },
    { label: "Collections", href: "/admin/collections" },
    { label: "Product masters", href: "/admin/product-masters" },
  ] },
  { label: "Projects", items: [
    { label: "All projects", href: "/admin/projects" },
    { label: "Add project", href: "/admin/projects/new" },
    { label: "Project categories", href: "/admin/project-categories" },
  ] },
  { label: "Content", items: [
    { label: "Catalogues", href: "/admin/catalogues" },
    { label: "Technical sheets", href: "/admin/technical" },
    { label: "Certifications", href: "/admin/certifications" },
  ] },
  { label: "Operations", items: [
    { label: "Enquiries", href: "/admin/enquiries" },
    { label: "Media", href: "/admin/media" },
  ] },
  { label: "Website settings", items: [
    { label: "Contact information", href: "/admin/settings/contact" },
    { label: "Social links", href: "/admin/settings/social" },
  ] },
];

const pageTitles = new Map<string, string>(
  navigation.flatMap((group) =>
    group.items.map((item) => [item.href, item.label] as const),
  ),
);

export function AdminShell({ adminName, role, children }: Readonly<{ adminName: string; role: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = pageTitles.get(pathname) ?? "Content studio";

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
          {group.items.map((item) => <Link aria-current={pathname === item.href ? "page" : undefined} href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></Link>)}
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
