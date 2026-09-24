"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { AdminIcon } from "@/components/admin/admin-icons";
import { saveContactSettings } from "@/server/admin/contact-settings-actions";
import type { ContactSettingsEditorData, SiteLogo } from "@/types/contact-settings";
import styles from "./contact-settings-editor.module.css";

function SaveButton({ uploading }: Readonly<{ uploading: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={styles.save} disabled={pending || uploading} type="submit">{pending ? "Saving changes…" : uploading ? "Uploading logo…" : "Save changes"}</button>;
}

function errorMessage(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "The logo could not be uploaded.";
}

export function ContactSettingsEditor({ data }: Readonly<{ data: ContactSettingsEditorData }>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<SiteLogo>(data.logo);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("alt", "ICON — World of Tile");
      const response = await fetch("/api/admin/site-media", { method: "POST", body: form });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("asset" in payload)) throw new Error(errorMessage(payload));
      const asset = payload.asset as { id?: unknown; src?: unknown; alt?: unknown; width?: unknown; height?: unknown };
      if (typeof asset.id !== "string" || typeof asset.src !== "string") throw new Error("The uploaded logo response was incomplete.");
      setLogo({
        mediaId: asset.id,
        src: asset.src,
        alt: typeof asset.alt === "string" ? asset.alt : "ICON — World of Tile",
        width: typeof asset.width === "number" ? asset.width : 2060,
        height: typeof asset.height === "number" ? asset.height : 894,
      });
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "The logo could not be uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return <form action={saveContactSettings} className={styles.editor}>
    <section className={styles.section}>
      <header><span>01</span><div><h2>Website branding</h2><p>The published logo is used in the public header and footer.</p></div></header>
      <div className={styles.logoEditor}>
        <div className={styles.logoPreview}><Image alt={logo.alt} height={logo.height} src={logo.src} unoptimized={!logo.src.startsWith("/")} width={logo.width} /></div>
        <div className={styles.logoControls}>
          <input name="logoMediaId" type="hidden" value={logo.mediaId} />
          <label className={styles.filePicker}><AdminIcon name="plus" /><span>{uploading ? "Uploading…" : "Upload website logo"}</span><input ref={fileRef} accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(event) => void uploadLogo(event.target.files?.[0])} type="file" /></label>
          <button className={styles.secondary} onClick={() => setLogo({ mediaId: "", src: "/brand/icon-logo-horizontal.png", alt: "ICON — World of Tile", width: 2060, height: 894 })} type="button">Use default logo</button>
          <small>JPG, PNG, WebP or AVIF. A wide transparent logo works best.</small>
          {uploadError ? <p className={styles.fieldError} role="alert">{uploadError}</p> : null}
        </div>
      </div>
    </section>

    <section className={styles.section}>
      <header><span>02</span><div><h2>Inquiry contacts</h2><p>These details appear in the Contact page and website footer.</p></div></header>
      <div className={styles.contactGrid}>
        <fieldset><legend>Domestic contact</legend><div className={styles.fields}>
          <label><span>Label *</span><input defaultValue={data.domestic.label} maxLength={80} name="domesticLabel" required /></label>
          <label><span>Phone number *</span><input autoComplete="tel" defaultValue={data.domestic.phone} maxLength={40} name="domesticPhone" required type="tel" /></label>
          <label><span>Email address *</span><input autoComplete="email" defaultValue={data.domestic.email} maxLength={254} name="domesticEmail" required type="email" /></label>
        </div></fieldset>
        <fieldset><legend>Export contact</legend><div className={styles.fields}>
          <label><span>Label *</span><input defaultValue={data.export.label} maxLength={80} name="exportLabel" required /></label>
          <label><span>Phone number *</span><input autoComplete="tel" defaultValue={data.export.phone} maxLength={40} name="exportPhone" required type="tel" /></label>
          <label><span>Email address *</span><input autoComplete="email" defaultValue={data.export.email} maxLength={254} name="exportEmail" required type="email" /></label>
        </div></fieldset>
      </div>
    </section>

    <section className={styles.section}>
      <header><span>03</span><div><h2>Social media</h2><p>Published links appear in the Contact page and footer.</p></div></header>
      <div className={styles.rows}>{data.socials.map((social, index) => <div className={styles.row} key={`${social.label}-${index}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <label><span>Platform *</span><input defaultValue={social.label} maxLength={60} name="socialLabel" required /></label>
        <label><span>Public URL *</span><input defaultValue={social.href} maxLength={500} name="socialUrl" required type="url" /></label>
      </div>)}</div>
    </section>

    <section className={styles.section}>
      <header><span>04</span><div><h2>Addresses and locations</h2><p>These manufacturing locations appear on the Contact page; the first address is also shown in the footer.</p></div></header>
      <div className={styles.units}>{data.units.map((unit, index) => <fieldset key={unit.id}>
        <legend><span>{String(index + 1).padStart(2, "0")}</span>{unit.name}</legend>
        <input name="unitId" type="hidden" value={unit.id} />
        <div className={styles.unitGrid}>
          <label><span>Location name *</span><input defaultValue={unit.name} maxLength={180} name="unitName" required /></label>
          <label><span>Map URL *</span><input defaultValue={unit.mapUrl} maxLength={500} name="unitMapUrl" required type="url" /></label>
          <label className={styles.address}><span>Postal address * <small>Use one line per address line.</small></span><textarea defaultValue={unit.addressLines.join("\n")} maxLength={1600} name="unitAddress" required rows={6} /></label>
        </div>
      </fieldset>)}</div>
    </section>

    <footer className={styles.actions}><p>Saving publishes these settings across the public website.</p><SaveButton uploading={uploading} /></footer>
  </form>;
}
