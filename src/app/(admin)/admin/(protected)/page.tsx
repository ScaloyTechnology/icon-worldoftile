import Link from "next/link";

import { AdminIcon } from "@/components/admin/admin-icons";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getDb } from "@/server/db";
import styles from "./admin-home.module.css";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  let counts: { products: number; publishedProducts: number; collections: number; featuredCollections: number } | null = null;
  try {
    const db = getDb();
    const [products, publishedProducts, collections, featuredCollections] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { state: "PUBLISHED" } }),
      db.collection.count(),
      db.collection.count({ where: { state: "PUBLISHED", isFeatured: true } }),
    ]);
    counts = { products, publishedProducts, collections, featuredCollections };
  } catch (error) {
    console.error("Admin dashboard counts could not be loaded", error);
  }

  const cards = [
    { label: "Total products", value: counts?.products, icon: "product" as const },
    { label: "Published products", value: counts?.publishedProducts, icon: "external" as const },
    { label: "Total collections", value: counts?.collections, icon: "collection" as const },
    { label: "Featured collections", value: counts?.featuredCollections, icon: "dashboard" as const },
  ];

  return <main className={styles.page}>
    <AdminPageHeader eyebrow="Overview" title="Dashboard" description="A concise view of the live ICON catalogue." />
    {!counts ? <p className={styles.notice} role="alert">Dashboard totals are temporarily unavailable. No data has been changed.</p> : null}
    <section className={styles.cards} aria-label="Catalogue summary">
      {cards.map((card) => <article key={card.label}><span><AdminIcon name={card.icon} /></span><div><strong>{card.value ?? "—"}</strong><small>{card.label}</small></div></article>)}
    </section>
    <section className={styles.quick}>
      <header><h2>Quick actions</h2><p>Continue with the most common catalogue tasks.</p></header>
      <div>
        <Link href="/admin/products?editor=new"><AdminIcon name="plus" /><span>Add product</span></Link>
        <Link href="/admin/collections?editor=new"><AdminIcon name="plus" /><span>Add collection</span></Link>
        <Link href="/" target="_blank" rel="noreferrer"><AdminIcon name="external" /><span>View website</span></Link>
      </div>
    </section>
  </main>;
}
