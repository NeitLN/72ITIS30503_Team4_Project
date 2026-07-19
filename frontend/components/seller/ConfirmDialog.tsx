'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

/** Native <dialog> gives us focus-trapping, Escape-to-close, and correct
 * accessible-name wiring for free — no custom focus-management code. */
export const ConfirmDialog = ({
  open, title, body, confirmLabel, cancelLabel = 'Hủy', onConfirm, onCancel, danger,
}: ConfirmDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      onClose={onCancel}
      className="m-auto max-w-sm w-[90vw] border border-neutral-900 p-0 backdrop:bg-neutral-950/50"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="font-display text-lg font-bold uppercase tracking-tight text-neutral-900 mb-2">
          {title}
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed mb-6">{body}</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="font-mono text-xs uppercase tracking-wider" data-testid="confirm-dialog-cancel">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={`font-mono text-xs uppercase tracking-wider ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-neutral-900 text-white'}`}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
};
