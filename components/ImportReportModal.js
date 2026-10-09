"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ImportReportModal({ open, onOpenChange, reportData }) {
  if (!reportData) return null;

  const isSuccess = reportData.success;
  const { report, error } = reportData;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 bg-[#1C1C1E]/35 dark:bg-[#1C1C1E]/70 z-50" />
        <Dialog.Content className="modal-content fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-surface border border-surface-border rounded-2xl shadow-xl p-6 z-50 text-text focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-[18px] font-semibold text-text">
              {isSuccess ? "Import complete" : "Import failed"}
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

          {isSuccess && report ? (
            <div className="space-y-4">
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between py-1 border-b border-surface-border/50">
                  <span className="text-text-subtle">Bookmarks added</span>
                  <span className="font-medium text-text">{report.bookmarksAdded}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border/50">
                  <span className="text-text-subtle">Duplicates skipped</span>
                  <span className="font-medium text-text">{report.duplicatesSkipped}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border/50">
                  <span className="text-text-subtle">Invalid entries skipped</span>
                  <span className="font-medium text-text">{report.invalidSkipped}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border/50">
                  <span className="text-text-subtle">Containers created</span>
                  <span className="font-medium text-text">{report.containersCreated}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-border/50">
                  <span className="text-text-subtle">Containers merged into</span>
                  <span className="font-medium text-text">{report.containersMergedInto}</span>
                </div>
              </div>

              {report.skippedItems && report.skippedItems.length > 0 && (
                <div className="mt-3">
                  <div className="text-[13px] font-medium text-text-subtle mb-2">
                    Skipped items ({report.skippedItems.length}):
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 p-2 rounded-lg bg-bg border border-surface-border text-[13px]">
                    {report.skippedItems.map((item, idx) => (
                      <div key={idx} className="pb-2 border-b border-surface-border/40 last:border-0 last:pb-0">
                        <div className="font-medium text-text truncate">{item.title}</div>
                        <div className="text-text-subtle truncate text-[12px]">{item.url}</div>
                        <div className="text-text-faint text-[12px]">{item.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[14px] text-text-subtle leading-relaxed my-2">
              {error || "An unknown error occurred during import."}
            </div>
          )}

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
