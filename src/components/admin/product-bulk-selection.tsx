"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { deleteProducts } from "@/server/admin/product-actions";
import styles from "./product-bulk-selection.module.css";

type Selection = { selected: Set<string>; ids: readonly string[]; pending: boolean; toggle: (id: string, checked: boolean) => void; toggleAll: (checked: boolean) => void };
const SelectionContext = createContext<Selection | null>(null);

export function ProductBulkSelection({ ids, returnHref, children }: Readonly<{ ids: readonly string[]; returnHref: string; children: ReactNode }>) {
  const [selected, setSelected] = useState(new Set<string>());
  const [state, action, pending] = useActionState(deleteProducts, { error: "" });
  const toggle = (id: string, checked: boolean) => setSelected(current => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });
  return <SelectionContext.Provider value={{ ids, selected, pending, toggle, toggleAll: checked => setSelected(new Set(checked ? ids : [])) }}>
    <form action={action} className={styles.toolbar} onSubmit={event => {
      if (pending || !window.confirm(`Permanently delete ${selected.size} selected product(s)? Their product data and variants will be removed. Enquiry records and shared images will be kept.`)) event.preventDefault();
    }}>
      <input name="returnHref" type="hidden" value={returnHref} />
      {[...selected].map(id => <input key={id} name="id" type="hidden" value={id} />)}
      <span aria-live="polite">{selected.size} selected</span>
      <button disabled={pending || !selected.size} onClick={() => setSelected(new Set())} type="button">Clear selection</button>
      <button className={styles.delete} disabled={pending || !selected.size || selected.size > 1000} type="submit">{pending ? "Deleting…" : "Delete selected"}</button>
      <small>{selected.size > 1000 ? "Select up to 1000 products per batch." : "Select all applies to the products in this filtered list."}</small>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
    {children}
  </SelectionContext.Provider>;
}

export function ProductSelectionCheckbox({ id, name }: Readonly<{ id?: string; name?: string }>) {
  const selection = useContext(SelectionContext);
  const ref = useRef<HTMLInputElement>(null);
  const count = selection?.selected.size ?? 0;
  const total = selection?.ids.length ?? 0;
  useEffect(() => { if (ref.current) ref.current.indeterminate = !id && count > 0 && count < total; }, [id, count, total]);
  if (!selection) return null;
  return <input ref={ref} className={styles.checkbox} type="checkbox"
    aria-label={id ? `Select ${name ?? "product"}` : "Select all products in this filtered list"}
    checked={id ? selection.selected.has(id) : total > 0 && count === total}
    disabled={selection.pending || !total}
    onChange={event => id ? selection.toggle(id, event.target.checked) : selection.toggleAll(event.target.checked)} />;
}
