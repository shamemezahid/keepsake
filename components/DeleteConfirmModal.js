"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2 } from "lucide-react";

export function DeleteConfirmModal({
  open,
  onOpenChange,
  title = "Delete",
  description = "Are you sure you want to delete this item?",
  confirmText = "Delete",
  onConfirm,
}) {
  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 bg-[#1C1C1E]/35 dark:bg-[#1C1C1E]/70 z-50" />
        <Dialog.Content className="modal-content fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[420px] bg-surface border border-surface-border rounded-2xl shadow-xl p-6 z-50 text-text focus:outline-none">
          <div className="flex items-center justify-between mb-3">
            <Dialog.Title className="text-[18px] font-semibold text-text flex items-center gap-2">
              <Trash2 strokeWidth={1.5} className="size-5 text-red-700 dark:text-red-400 shrink-0" />
              <span>{title}</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="size-8 rounded-lg flex items-center justify-center hover:bg-hover text-text-subtle hover:text-text cursor-pointer transition-colors"
              >
                <X strokeWidth={1.5} className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-[14px] text-text-subtle leading-relaxed mb-6">
            {description}
          </Dialog.Description>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-2 rounded-lg text-[14px] text-text-subtle hover:bg-hover cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-[14px] font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white cursor-pointer transition-colors"
              style={{ color: "#ffffff", backgroundColor: "var(--color-red-600, #dc2626)" }}
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
