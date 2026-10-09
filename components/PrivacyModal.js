"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function PrivacyModal({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 bg-[#1C1C1E]/35 dark:bg-[#1C1C1E]/70 z-50" />
        <Dialog.Content className="modal-content fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-surface border border-surface-border rounded-2xl shadow-xl p-6 z-50 text-text focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-[18px] font-semibold text-text">
              Privacy note
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

          <div className="space-y-3 text-[14px] leading-relaxed text-text-subtle">
            <p>
              Your bookmarks stay on this device. They are saved in your browser&apos;s localStorage and are never sent to a server. This app has no backend, no accounts, and no analytics.
            </p>
            <p>
              That also means they won&apos;t follow you to another browser or device, and clearing your browser&apos;s site data will erase them. Use Export JSON to keep a backup.
            </p>
            <p>
              One exception: to show each site&apos;s icon, your browser requests it from DuckDuckGo&apos;s icon service, which receives the domain of each saved site and your IP address. It does not receive page titles, descriptions, or anything else. If an icon can&apos;t be loaded, a generic globe is shown.
            </p>
            <p>
              The font is bundled with the app and loaded from this site.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="btn-primary px-4 py-2 rounded-lg text-[14px] font-medium hover:opacity-90 cursor-pointer transition-opacity"
                style={{ color: "var(--surface)", backgroundColor: "var(--text)" }}
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
