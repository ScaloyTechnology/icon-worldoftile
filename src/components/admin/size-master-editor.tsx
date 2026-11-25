"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { saveSize } from "@/server/admin/size-actions";
import styles from "./size-master.module.css";

type SizeRecord = Readonly<{ id: string; label: string; widthMm: string; lengthMm: string; assignments: number }>;

function Fields({ size }: Readonly<{ size?: SizeRecord }>) {
  const { pending } = useFormStatus();
  return <>
    <input name="id" type="hidden" value={size?.id ?? ""} />
    <fieldset className={styles.fields} disabled={pending}>
      <label>Size label *<input autoFocus defaultValue={size?.label ?? ""} maxLength={100} name="label" placeholder="600 × 1200 mm" required /></label>
      <label>Width (mm) *<input defaultValue={size?.widthMm ?? ""} min="0.01" max="100000" name="widthMm" required step="0.01" type="number" /></label>
      <label>Length (mm) *<input defaultValue={size?.lengthMm ?? ""} min="0.01" max="100000" name="lengthMm" required step="0.01" type="number" /></label>
    </fieldset>
    <div className={styles.actions}><Link aria-disabled={pending || undefined} href="/admin/sizes" onClick={event => { if (pending) event.preventDefault(); }}>Cancel</Link><button disabled={pending} type="submit">{pending ? "Saving…" : size ? "Save changes" : "Add size"}</button></div>
  </>;
}

export function SizeMasterEditor({ size }: Readonly<{ size?: SizeRecord }>) {
  return <form action={saveSize} className={styles.editor}>
    <h2>{size ? "Edit Size" : "Add a new Size"}</h2>
    <p>{size?.assignments ? `This shared Size is used by ${size.assignments} product variant(s). Editing its label or dimensions updates all linked products. Their selections and thickness remain unchanged.` : "Add sizes to the shared library, then select them when adding or editing a product."}</p>
    <Fields size={size} />
  </form>;
}
