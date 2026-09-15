import Link from "next/link";
import styles from "./admin-placeholder.module.css";

export function AdminPlaceholder({ title, description, phase }: Readonly<{ title: string; description: string; phase: string }>) {
  return <main className={styles.main}>
    <p className={styles.eyebrow}>Admin module / {phase}</p>
    <h1>{title}</h1>
    <p className={styles.description}>{description}</p>
    <section className={styles.panel}>
      <span>Module status</span>
      <strong>Prepared for the next admin phase</strong>
      <p>No records are being fabricated and no editing controls are active yet. This route is protected and ready for its dedicated data-management implementation.</p>
    </section>
    <Link className={styles.back} href="/admin/dashboard">← Return to dashboard</Link>
  </main>;
}
