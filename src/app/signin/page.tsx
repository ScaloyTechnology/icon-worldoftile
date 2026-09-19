import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { currentAdmin } from "@/server/auth/session";
import { adminAuthConfiguration } from "@/server/auth/configuration";
import styles from "./signin.module.css";

// Read the deployed application's environment per request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Secure access to the ICON content studio.",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  if (await currentAdmin()) redirect("/admin/dashboard");
  const configuration = adminAuthConfiguration();

  return <main className={styles.page}>
    <section className={styles.material} aria-label="ICON World of Tile">
      <Image
        alt="ICON — World of Tile"
        className={styles.logo}
        height={894}
        priority
        src="/brand/icon-logo-horizontal.png"
        width={2060}
      />
      <div className={styles.statement}>
        <p>Private workspace</p>
        <h2>Materials.<br />Projects.<br />One studio.</h2>
      </div>
      <div className={styles.composition} aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <span className={styles.edition}>ICON / Content studio</span>
    </section>

    <section className={styles.access} aria-labelledby="signin-title">
      <div className={styles.accessInner}>
        <p className={styles.eyebrow}>Secure access / 01</p>
        <h1 id="signin-title">Sign in.</h1>
        <p className={styles.intro}>Enter your administrator credentials to continue to the ICON content studio.</p>
        <LoginForm configured={configuration.configured} configurationMessage={configuration.message} />
        <div className={styles.securityNote}>
          <span aria-hidden="true" />
          <p>Restricted to authorised ICON administrators.</p>
        </div>
      </div>
      <p className={styles.footer}>ICON — World of Tile</p>
    </section>
  </main>;
}
