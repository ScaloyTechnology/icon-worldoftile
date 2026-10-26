"use client";

import { deleteProduct } from "@/server/admin/product-actions";

export function ProductDeleteForm({ id, name }: Readonly<{ id: string; name: string }>) {
  return <form action={deleteProduct} onSubmit={event => {
    if (!window.confirm(`Permanently delete “${name}”? Its product data and variants will be removed. Enquiry records will be kept.`)) {
      event.preventDefault();
    }
  }}>
    <input name="id" type="hidden" value={id} />
    <button type="submit">Delete permanently</button>
  </form>;
}
