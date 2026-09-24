"use client";

import { useFormStatus } from "react-dom";

import styles from "./admin-enquiries.module.css";

type Status = "NEW" | "IN_PROGRESS" | "CLOSED" | "SPAM";
type ServerAction = (formData: FormData) => void | Promise<void>;

const options: ReadonlyArray<{ value: Status; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "CLOSED", label: "Closed" },
  { value: "SPAM", label: "Spam" },
];

function StatusSelect({ label, status }: Readonly<{ label: string; status: Status }>) {
  const { pending } = useFormStatus();
  return <select
    aria-label={label}
    className={styles.statusSelect}
    data-status={status}
    defaultValue={status}
    disabled={pending}
    name="status"
    onChange={(event) => event.currentTarget.form?.requestSubmit()}
  >{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

export function AdminEnquiryStatus({ action, id, label, returnTo, status }: Readonly<{ action: ServerAction; id: string; label: string; returnTo: string; status: Status }>) {
  return <form action={action} className={styles.statusForm}>
    <input name="id" type="hidden" value={id} />
    <input name="returnTo" type="hidden" value={returnTo} />
    <StatusSelect label={label} status={status} />
  </form>;
}
