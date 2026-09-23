"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminIcon } from "./admin-icons";
import styles from "./admin-shell.module.css";

type NavigationItem = Readonly<{ label: string; href: string; icon: Parameters<typeof AdminIcon>[0]["name"] }>;
type NavigationGroup = Readonly<{ label: string; items: readonly NavigationItem[] }>;

const navigation: readonly NavigationGroup[] = [
  { label: "General", items: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }] },
  { label: "Catalog", items: [
    { label: "Products", href: "/admin/products", icon: "product" },
    { label: "Categories", href: "/admin/categories", icon: "category" },
    { label: "Collections", href: "/admin/collections", icon: "collection" },
    { label: "Product specifications", href: "/admin/specifications", icon: "specification" },
  ] },
  { label: "Content", items: [{ label: "Projects / Gallery", href: "/admin/projects", icon: "project" }] },
  { label: "Operations", items: [{ label: "Enquiries", href: "/admin/enquiries", icon: "enquiry" }] },
  { label: "Settings", items: [{ label: "Contact information", href: "/admin/contact", icon: "contact" }] },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ adminName, role, children }: Readonly<{ adminName: string; role: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = navigation.flatMap((group) => group.items).find((item) => isCurrent(pathname, item.href))?.label ?? "Admin";
  const initials = adminName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("icon-admin-sidebar") === "collapsed");
  }, []);

  const toggleDesktop = () => setCollapsed((current) => {
    const next = !current;
    window.localStorage.setItem("icon-admin-sidebar", next ? "collapsed" : "expanded");
    return next;
  });

  return <div className={styles.shell} data-collapsed={collapsed || undefined}>
    <button className={`${styles.scrim} ${mobileOpen ? styles.scrimVisible : ""}`} aria-label="Close navigation" tabIndex={mobileOpen ? 0 : -1} type="button" onClick={() => setMobileOpen(false)} />

    <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`} id="admin-navigation">
      <div className={styles.brand}>
        <Link href="/admin" aria-label="ICON Admin dashboard"><Image alt="ICON — World of Tile" height={894} priority src="/brand/icon-logo-horizontal.png" width={2060} /></Link>
        <button aria-label="Close navigation" className={styles.mobileClose} onClick={() => setMobileOpen(false)} type="button"><AdminIcon name="close" /></button>
      </div>
      <nav aria-label="Admin navigation">
        {navigation.map((group) => <section className={styles.navGroup} key={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => <Link aria-current={isCurrent(pathname, item.href) ? "page" : undefined} href={item.href} key={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>
            <AdminIcon name={item.icon} /><span>{item.label}</span>
          </Link>)}
        </section>)}
      </nav>
      <div className={styles.sidebarFooter}>
        <Link href="/" target="_blank" rel="noreferrer"><AdminIcon name="external" /><span>View website</span></Link>
        <div className={styles.profile}><i>{initials}</i><span><strong>{adminName}</strong><small>{role.replaceAll("_", " ")}</small></span></div>
        <form action="/api/admin/logout" method="post"><button type="submit"><span className={styles.logoutIcon}>↪</span><span>Logout</span></button></form>
      </div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <div className={styles.topbarStart}>
          <button aria-controls="admin-navigation" aria-expanded={mobileOpen} aria-label="Open navigation" className={styles.mobileToggle} onClick={() => setMobileOpen(true)} type="button"><AdminIcon name="menu" /></button>
          <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={styles.collapseToggle} onClick={toggleDesktop} type="button"><AdminIcon name="menu" /></button>
          <div><span>ICON Admin</span><strong>{pageTitle}</strong></div>
        </div>
        <div className={styles.topbarAccount}>
          <i>{initials}</i><span><strong>{adminName}</strong><small>{role.replaceAll("_", " ")}</small></span>
          <form action="/api/admin/logout" method="post"><button type="submit">Logout</button></form>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
