"use client";

type DeleteAction = (formData: FormData) => void | Promise<void>;

export function AdminDeleteForm({ action, id, label, message }: Readonly<{
  action: DeleteAction;
  id: string;
  label: string;
  message: string;
}>) {
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm(message)) event.preventDefault();
  }}>
    <input name="id" type="hidden" value={id} />
    <button type="submit">{label}</button>
  </form>;
}

export function AdminDeleteButton({ action, label, message }: Readonly<{
  action: DeleteAction;
  label: string;
  message: string;
}>) {
  return <button onClick={(event) => {
    if (!window.confirm(message)) event.preventDefault();
  }} type="submit" formNoValidate formAction={action}>{label}</button>;
}
