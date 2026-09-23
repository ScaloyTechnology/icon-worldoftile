"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CollectionEditorData } from "@/server/admin/collection-editor-data";
import { CollectionEditor } from "./collection-editor";
import styles from "./product-editor.module.css";

type CollectionEditorModalProps = Readonly<{
  data: CollectionEditorData;
  error?: string;
  returnHref?: string;
}>;

export function CollectionEditorModal({ data, error, returnHref = "/admin/collections" }: CollectionEditorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  const restoreList = useCallback(() => {
    dialogRef.current?.close();
    router.replace(returnHref, { scroll: false });
    window.setTimeout(() => document.querySelector<HTMLElement>("[data-add-collection]")?.focus(), 50);
  }, [returnHref, router]);

  const requestClose = useCallback(() => {
    if (pending) return;
    if (dirty && !window.confirm("Discard the unsaved changes to this Collection?")) return;
    restoreList();
  }, [dirty, pending, restoreList]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  return <dialog
    aria-labelledby="collection-editor-title"
    className={styles.modal}
    ref={dialogRef}
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}
  >
    <CollectionEditor data={data} error={error} onCancel={requestClose} onDirty={() => setDirty(true)} onPendingChange={setPending} />
  </dialog>;
}
