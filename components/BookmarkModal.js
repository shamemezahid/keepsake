"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { normalizeUrl, findDuplicate } from "@/lib/url";
import { useStore } from "@/hooks/useStore";

export function BookmarkModal({
  open,
  onOpenChange,
  initialData = null, // if editing: { bookmark, containerId }
  defaultContainerId = null,
}) {
  const { containers, addBookmark, updateBookmark, addContainer } = useStore();

  const isEditing = Boolean(initialData?.bookmark);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [urlError, setUrlError] = useState("");
  const [titleError, setTitleError] = useState("");

  const urlInputRef = useRef(null);

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      setUrlError("");
      setTitleError("");

      if (isEditing) {
        setUrl(initialData.bookmark.url || "");
        setTitle(initialData.bookmark.title || "");
        setDescription(initialData.bookmark.description || "");
        setSelectedContainerId(initialData.containerId);
      } else {
        setUrl("");
        setTitle("");
        setDescription("");

        const containerIdToUse =
          defaultContainerId || (containers.length > 0 ? containers[0].id : "");
        setSelectedContainerId(containerIdToUse);

        // Autofocus URL field on add
        setTimeout(() => {
          urlInputRef.current?.focus();
        }, 50);
      }
    }
  }, [open, isEditing, initialData, defaultContainerId, containers]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setUrlError("");
    setTitleError("");

    // 1. Validate & normalize URL
    const norm = normalizeUrl(url);
    if (!norm.valid) {
      setUrlError(norm.error || "Please enter a valid URL");
      return;
    }

    // 2. Duplicate detection
    const excludeId = isEditing ? initialData.bookmark.id : null;
    const dup = findDuplicate(containers, norm.url, excludeId);
    if (dup) {
      setUrlError(`Already saved in ${dup.containerTitle}`);
      return;
    }

    // 3. Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title cannot be blank");
      return;
    }

    // 4. Container validation / fallback
    let targetContainerId = selectedContainerId;
    if (!targetContainerId || !containers.some((c) => c.id === targetContainerId)) {
      if (containers.length > 0) {
        targetContainerId = containers[0].id;
      } else {
        const created = addContainer("Container");
        targetContainerId = created.id;
      }
    }

    // 5. Commit
    if (isEditing) {
      updateBookmark(initialData.containerId, targetContainerId, {
        ...initialData.bookmark,
        url: norm.url,
        title: trimmedTitle,
        description: description.trim(),
      });
    } else {
      addBookmark(targetContainerId, {
        url: norm.url,
        title: trimmedTitle,
        description: description.trim(),
      });
    }

    onOpenChange(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 bg-[#1C1C1E]/35 dark:bg-[#1C1C1E]/70 z-50" />
        <Dialog.Content className="modal-content fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[440px] bg-surface border border-surface-border rounded-2xl shadow-xl p-6 z-50 text-text focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-[18px] font-semibold text-text">
              {isEditing ? "Edit bookmark" : "Add bookmark"}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL field */}
            <div>
              <label
                htmlFor="bookmark-url"
                className="block text-[13px] font-medium text-text-subtle mb-1"
              >
                URL
              </label>
              <input
                ref={urlInputRef}
                id="bookmark-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                className={`w-full bg-bg border ${urlError ? "border-focus-ring" : "border-surface-border"
                  } text-text rounded-lg px-3 py-2 text-[14px] focus-visible:outline-2 focus-visible:outline-focus-ring`}
              />
              {urlError && (
                <p className="text-[13px] text-text-subtle mt-1">{urlError}</p>
              )}
            </div>

            {/* Title field */}
            <div>
              <label
                htmlFor="bookmark-title"
                className="block text-[13px] font-medium text-text-subtle mb-1"
              >
                Title
              </label>
              <input
                id="bookmark-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="Page title"
                className={`w-full bg-bg border ${titleError ? "border-focus-ring" : "border-surface-border"
                  } text-text rounded-lg px-3 py-2 text-[14px] focus-visible:outline-2 focus-visible:outline-focus-ring`}
              />
              {titleError && (
                <p className="text-[13px] text-text-subtle mt-1">{titleError}</p>
              )}
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="bookmark-description"
                className="block text-[13px] font-medium text-text-subtle mb-1"
              >
                Description (optional)
              </label>
              <input
                id="bookmark-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Optional notes or summary"
                className="w-full bg-bg border border-surface-border text-text rounded-lg px-3 py-2 text-[14px] focus-visible:outline-2 focus-visible:outline-focus-ring"
              />
            </div>

            {/* Container select */}
            <div>
              <label
                htmlFor="bookmark-container"
                className="block text-[13px] font-medium text-text-subtle mb-1"
              >
                Container
              </label>
              <select
                id="bookmark-container"
                value={selectedContainerId}
                onChange={(e) => setSelectedContainerId(e.target.value)}
                className="w-full bg-bg border border-surface-border text-text rounded-lg px-3 py-2 text-[14px] focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title || "Untitled"}
                  </option>
                ))}
                {containers.length === 0 && (
                  <option value="default">Container (new)</option>
                )}
              </select>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-2 rounded-lg text-[14px] text-text-subtle hover:bg-hover cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-2 rounded-lg text-[14px] font-medium hover:opacity-90 cursor-pointer transition-opacity"
                style={{ color: "var(--surface)", backgroundColor: "var(--text)" }}
              >
                {isEditing ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
