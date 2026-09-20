"use client";

import Image from "next/image";
import { useId, useState } from "react";
import styles from "./admin-media-picker.module.css";

export type AdminSelectableMedia = Readonly<{
  id: string;
  filename: string;
  alt: string;
  src: string;
  mimeType: string;
}>;

type Props = Readonly<{
  name: string;
  label: string;
  assets: readonly AdminSelectableMedia[];
  initialId?: string;
  value?: string;
  onChange?: (id: string) => void;
  help?: string;
  statusLabel?: string;
  selectionStatus?: string;
  emptyText?: string;
}>;

export function AdminMediaPicker({ name, label, assets, initialId = "", value, onChange, help, statusLabel = "Approved media only", selectionStatus = "Approved", emptyText = "Select existing media" }: Props) {
  const [localValue, setLocalValue] = useState(initialId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listId = useId();
  const selectedId = value === undefined ? localValue : value;
  const selected = assets.find((asset) => asset.id === selectedId);
  const results = assets.filter((asset) => `${asset.filename} ${asset.alt}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const choose = (id: string) => {
    setLocalValue(id);
    onChange?.(id);
    setOpen(false);
  };

  return <div className={styles.field}>
    <div className={styles.heading}><strong>{label}</strong><span>{statusLabel}</span></div>
    <input type="hidden" name={name} value={selectedId} />
    {selected ? <div className={styles.selection}>
      <span className={styles.preview}>{selected.mimeType.startsWith("image/") ? <Image alt={selected.alt} fill sizes="92px" src={selected.src} unoptimized={!selected.src.startsWith("/")} /> : <span>PDF</span>}</span>
      <span className={styles.metadata}><strong>{selected.filename}</strong><small>{selected.alt || "Add descriptive alt text below"}</small><em>{selectionStatus}</em></span>
      <span className={styles.actions}><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={listId}>Change</button><button type="button" onClick={() => choose("")}>Remove</button></span>
    </div> : selectedId ? <div className={styles.unavailable}><span>Previously selected media is unavailable or no longer approved.</span><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={listId}>Change</button><button type="button" onClick={() => choose("")}>Remove</button></div>
      : <button className={styles.empty} type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={listId}>{emptyText} <span aria-hidden="true">+</span></button>}
    {help ? <p className={styles.help}>{help}</p> : null}
    {open ? <div className={styles.drawer} id={listId}>
      <label className={styles.searchLabel}>Search media<input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename or alt text" /></label>
      <div className={styles.results}>{results.map((asset) => <button className={styles.result} type="button" key={asset.id} onClick={() => choose(asset.id)} aria-label={`Select ${asset.filename}`}>
        <span className={styles.thumb}>{asset.mimeType.startsWith("image/") ? <Image alt="" fill sizes="64px" src={asset.src} unoptimized={!asset.src.startsWith("/")} /> : <span>PDF</span>}</span>
        <span><strong>{asset.filename}</strong><small>{asset.alt}</small></span>
      </button>)}{!results.length ? <p className={styles.noResults}>No matching assets available.</p> : null}</div>
    </div> : null}
  </div>;
}
