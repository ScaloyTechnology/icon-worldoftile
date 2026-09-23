"use client";

import { useFormStatus } from "react-dom";

import styles from "./admin-ui.module.css";

type ServerAction = (form: FormData) => void | Promise<void>;

function ToggleButton({ checked, disabled, label }: Readonly<{ checked: boolean; disabled?: boolean; label: string }>) {
  const { pending } = useFormStatus();
  return <button
    aria-checked={checked}
    aria-label={label}
    className={styles.toggle}
    data-pending={pending || undefined}
    disabled={disabled || pending}
    role="switch"
    type="submit"
  ><span /></button>;
}

export function AdminToggleForm({ action, checked, disabled, id, label }: Readonly<{ action: ServerAction; checked: boolean; disabled?: boolean; id: string; label: string }>) {
  return <form action={action} className={styles.toggleForm}>
    <input name="id" type="hidden" value={id} />
    <input name="target" type="hidden" value={checked ? "off" : "on"} />
    <ToggleButton checked={checked} disabled={disabled} label={label} />
  </form>;
}
