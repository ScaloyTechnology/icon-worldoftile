import Link from "next/link";
import type { AdminDashboardData } from "@/server/admin/dashboard";
import styles from "./admin-dashboard.module.css";

const quickActions = [
  { label: "Add product", href: "/admin/products/new" },
  { label: "Add collection", href: "/admin/collections?action=new" },
  { label: "Add project", href: "/admin/projects/new" },
  { label: "View enquiries", href: "/admin/enquiries" },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminDashboard({ data }: Readonly<{ data: AdminDashboardData }>) {
  const connected = data.databaseStatus === "connected";
  return <main className={styles.main}>
    <header className={styles.pageHeader}>
      <div><p>Administration / Overview</p><h1>Dashboard</h1><span>Monitor the content foundation before the management modules are connected.</span></div>
      <div className={`${styles.database} ${connected ? styles.connected : styles.unavailable}`}><small>Database</small><strong><i />{connected ? "Connected" : "Unavailable"}</strong></div>
    </header>

    {!connected ? <div className={styles.alert} role="status"><strong>Database connection unavailable.</strong><span>Check PostgreSQL, `DATABASE_URL`, migrations, and the generated Prisma client before trying again.</span></div> : null}

    <section className={styles.section} aria-labelledby="overview-title">
      <div className={styles.sectionHeading}><div><p>01 / Overview</p><h2 id="overview-title">Content totals</h2></div><span>Live PostgreSQL counts</span></div>
      <div className={styles.metrics}>{data.metrics.map((metric, index) => <article key={metric.label}><small>{String(index + 1).padStart(2, "0")}</small><strong>{connected ? metric.value : "—"}</strong><span>{metric.label}</span></article>)}</div>
    </section>

    <div className={styles.columns}>
      <section className={styles.section} aria-labelledby="actions-title">
        <div className={styles.sectionHeading}><div><p>02 / Shortcuts</p><h2 id="actions-title">Quick actions</h2></div></div>
        <nav className={styles.actions} aria-label="Quick actions">{quickActions.map((action) => <Link href={action.href} key={action.href}><span>{action.label}</span><i aria-hidden="true">↗</i></Link>)}</nav>
      </section>

      <section className={styles.section} aria-labelledby="recent-title">
        <div className={styles.sectionHeading}><div><p>03 / Activity</p><h2 id="recent-title">Recent content</h2></div></div>
        {data.recentItems.length ? <ul className={styles.recent}>{data.recentItems.map((item) => <li key={`${item.type}-${item.id}`}><div><small>{item.type}</small><strong>{item.title}</strong></div><div><span>{item.status.replaceAll("_", " ")}</span><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div></li>)}</ul> : <div className={styles.empty}><strong>No recent content</strong><p>Products and projects will appear here after their admin modules are connected.</p></div>}
      </section>
    </div>

    <section className={styles.foundation} aria-labelledby="foundation-title"><div><p>Admin foundation</p><h2 id="foundation-title">Ready for structured content.</h2></div><p>Authentication and the dashboard are active. Categories, Collections and Product Masters are the next implementation phase; the current module links intentionally open preparation pages.</p></section>
  </main>;
}
