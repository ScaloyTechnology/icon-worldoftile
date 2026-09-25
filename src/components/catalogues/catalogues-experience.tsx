"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Arrow } from "@/components/arrow";
import type { PublicCatalogue } from "@/types/catalogues";
import styles from "./catalogues.module.css";

type Market = "domestic" | "export";

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg>;
}

export function CataloguesExperience({ catalogues }: Readonly<{ catalogues: readonly PublicCatalogue[] }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<PublicCatalogue | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.body.style.overflow = "";
      setSelected(null);
      setMarket(null);
      setSubmitted(false);
      setSubmitting(false);
      setFormError("");
      setEmailSent(false);
      openerRef.current?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  function openDownload(catalogue: PublicCatalogue, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setSelected(catalogue);
    setMarket(null);
    setSubmitted(false);
    setSubmitting(false);
    setFormError("");
    setEmailSent(false);
    dialogRef.current?.showModal();
    document.body.style.overflow = "hidden";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !market || submitting) return;

    if (!selected.available) {
      setFormError("This catalogue PDF is not available for download yet.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/catalogues/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogueId: selected.id,
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          market,
          website: String(formData.get("website") ?? ""),
        }),
      });
      const result = await response.json() as { downloadUrl?: string; filename?: string; emailSent?: boolean; error?: string };

      if (!response.ok || !result.downloadUrl) {
        throw new Error(result.error || "We could not process your catalogue request. Please try again.");
      }

      const anchor = document.createElement("a");
      anchor.href = result.downloadUrl;
      anchor.download = result.filename || `${selected.slug}.pdf`;
      anchor.rel = "noopener";
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setEmailSent(result.emailSent === true);
      setSubmitted(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not process your catalogue request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className={styles.page} id="main">
    <section className={styles.hero} data-header-theme="light">
      <div className={styles.heroCopy}>
        <p className="eyebrow">ICON / Publication library</p>
        <h1><span>Material</span><span>catalogues.</span></h1>
        <p>Explore current collections, surface characters and applications through ICON’s digital publications.</p>
      </div>
      <div className={styles.heroIndex}><span>PUBLICATIONS</span><b>{String(catalogues.length).padStart(2, "0")}</b></div>
      <div className={styles.heroLine} aria-hidden="true" />
    </section>

    <section className={styles.library} aria-labelledby="catalogue-library-title">
      <header className={styles.libraryHeader}>
        <div><p className="eyebrow">01 / Catalogue library</p><h2 id="catalogue-library-title">Browse the<br />latest editions.</h2></div>
        <p>Select a publication to request access. Your PDF download starts after the short contact form is completed.</p>
      </header>
      <div className={styles.grid}>
        {catalogues.map((catalogue, index) => <article className={styles.card} key={catalogue.id}>
          <button aria-haspopup="dialog" className={styles.coverButton} onClick={(event) => openDownload(catalogue, event.currentTarget)} type="button">
            <span className={styles.cover}>
              <Image alt={catalogue.cover.alt} fill sizes="(max-width: 700px) 86vw, 30vw" src={catalogue.cover.src} style={{ objectFit: "cover" }} unoptimized={!catalogue.cover.src.startsWith("/")} />
              <i aria-hidden="true">ICON</i>
              <strong>{catalogue.title}</strong>
              <small>WORLD OF TILE</small>
              <span className={styles.coverShade} />
            </span>
            <span className={styles.cardMeta}>
              <span><small>{String(index + 1).padStart(2, "0")} / Catalogue</small><strong>{catalogue.title}</strong><i>{catalogue.edition}</i></span>
              <b aria-label={`Request ${catalogue.title} PDF`}><DownloadIcon /></b>
            </span>
          </button>
        </article>)}
      </div>
    </section>

    <section className={styles.footerStatement} data-header-theme="dark">
      <p className="eyebrow">ICON / World of Tile</p>
      <h2>A closer look at<br />surfaces in context.</h2>
      <a href="/products">Explore products <Arrow diagonal /></a>
    </section>

    <dialog className={styles.dialog} onClick={(event) => { if (event.target === event.currentTarget) close(); }} ref={dialogRef}>
      <div className={styles.dialogPanel}>
        <header>
          <div><p className="eyebrow">Catalogue access</p><h2>{selected?.title ?? "Digital catalogue"}</h2><span>{selected?.fileLabel}</span></div>
          <button aria-label="Close catalogue form" onClick={close} type="button">Close <span aria-hidden="true">×</span></button>
        </header>
        {submitted ? <div className={styles.success} role="status">
          <span>Thank you</span>
          <h3>Your download has started.</h3>
          <p>{emailSent ? "A confirmation has been sent to your email. You can close this window and continue exploring ICON." : "Your PDF is downloading. We could not send the email confirmation this time, but you can continue exploring ICON."}</p>
          <button onClick={close} type="button">Continue exploring <Arrow /></button>
        </div> : <form onSubmit={submit}>
          <p>Tell us where to send relevant catalogue updates, then continue to the selected PDF.</p>
          <label aria-hidden="true" className={styles.honeypot}>Website<input autoComplete="off" name="website" tabIndex={-1} type="text" /></label>
          <div className={styles.fields}>
            <label><span>Name</span><input autoComplete="name" name="name" placeholder="Your full name" required type="text" /></label>
            <label><span>Phone number</span><input autoComplete="tel" inputMode="tel" name="phone" pattern="[0-9+() -]{7,20}" placeholder="+91 00000 00000" required type="tel" /></label>
            <label className={styles.wide}><span>Email</span><input autoComplete="email" name="email" placeholder="name@company.com" required type="email" /></label>
          </div>
          <fieldset>
            <legend>Enquiry market</legend>
            <div>
              <label data-selected={market === "domestic" || undefined}><input checked={market === "domestic"} name="market" onChange={() => setMarket("domestic")} type="checkbox" /><span><b>Domestic</b><small>India enquiries</small></span><i /></label>
              <label data-selected={market === "export" || undefined}><input checked={market === "export"} name="market" onChange={() => setMarket("export")} type="checkbox" /><span><b>Export</b><small>International enquiries</small></span><i /></label>
            </div>
          </fieldset>
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          <footer><small>By continuing, you agree to be contacted regarding this catalogue request.</small><button disabled={!market || submitting} type="submit">{submitting ? "Sending…" : "Send"} <DownloadIcon /></button></footer>
        </form>}
      </div>
    </dialog>
  </main>;
}
