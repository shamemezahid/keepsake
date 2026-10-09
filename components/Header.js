"use client";

import React, { useRef, useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Plus,
  Ellipsis,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
  Sun,
  Moon,
  ShieldCheck,
  Image,
  List,
  LayoutList,
  Check,
  SeparatorHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/config";
import { exportBookmarks, processImportFile, exportBookmarksCSV, processImportCSV } from "@/lib/importExport";
import { useStore } from "@/hooks/useStore";

export function Header({
  onOpenAddBookmark,
  onOpenPrivacyModal,
  onShowImportReport,
}) {
  const {
    rawState,
    containers,
    setContainers,
    toggleTheme,
    settings,
    appName,
    setAppName,
    appearance,
    setAppearance,
    useDividers,
    toggleUseDividers,
  } = useStore();
  const fileInputRef = useRef(null);
  const csvFileInputRef = useRef(null);

  const [isDarkModeActive, setIsDarkModeActive] = useState(false);

  const currentAppName = appName || settings?.appName || APP_NAME;
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentAppName);
  const [prevName, setPrevName] = useState(currentAppName);
  const inputRef = useRef(null);

  if (prevName !== currentAppName) {
    setPrevName(currentAppName);
    setNameDraft(currentAppName);
  }

  // Keep browser tab title synced
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = currentAppName;
    }
  }, [currentAppName]);

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  const commitRename = () => {
    setIsEditing(false);
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(currentAppName);
    } else if (trimmed !== currentAppName) {
      setAppName(trimmed);
    }
  };

  const handleDoubleClick = () => {
    startEditing();
  };

  const handleKeyDown = (e) => {
    if (isEditing) return;
    if (e.key === "F2" || e.key === "Enter") {
      e.preventDefault();
      startEditing();
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setNameDraft(currentAppName);
    }
  };

  // Keep dark mode switch indicator in sync
  useEffect(() => {
    const updateDarkMode = () => {
      if (typeof document !== "undefined") {
        setIsDarkModeActive(document.documentElement.classList.contains("dark"));
      }
    };
    updateDarkMode();

    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [settings?.theme]);

  const handleExport = () => {
    try {
      exportBookmarks({
        version: rawState.version,
        settings: rawState.settings,
        containers: rawState.containers,
      });
      toast.success("Bookmarks exported as JSON");
    } catch {
      toast.error("Failed to export bookmarks");
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = processImportFile(text, containers);

      if (result.success) {
        setContainers(result.nextContainers);
        toast.success(`Imported ${result.report.bookmarksAdded} bookmarks`);
        onShowImportReport({
          success: true,
          report: result.report,
        });
      } else {
        toast.error(result.error || "Failed to import JSON");
        onShowImportReport({
          success: false,
          error: result.error,
        });
      }
    } catch {
      toast.error("Failed to read the selected file.");
      onShowImportReport({
        success: false,
        error: "Failed to read the selected file.",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportBookmarksCSV(containers, currentAppName);
      toast.success("Bookmarks exported as CSV");
    } catch {
      toast.error("Failed to export bookmarks as CSV");
    }
  };

  const handleImportCSVClick = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
      csvFileInputRef.current.click();
    }
  };

  const handleCSVFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = processImportCSV(text, containers);

      if (result.success) {
        setContainers(result.nextContainers);
        toast.success(`Imported ${result.report.bookmarksAdded} bookmarks from CSV`);
        onShowImportReport({
          success: true,
          report: result.report,
        });
      } else {
        toast.error(result.error || "Failed to import CSV");
        onShowImportReport({
          success: false,
          error: result.error,
        });
      }
    } catch {
      toast.error("Failed to read the selected CSV file.");
      onShowImportReport({
        success: false,
        error: "Failed to read the selected CSV file.",
      });
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="group/header flex items-center justify-between py-8 px-4">
      <h1 className="text-[18px] font-semibold text-text tracking-normal flex items-center min-h-[32px]">
        {isEditing ? (
          <div className="inline-grid items-center">
            <span className="invisible whitespace-pre font-semibold text-[18px] col-start-1 row-start-1 px-0 py-0 select-none">
              {nameDraft || APP_NAME}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleInputKeyDown}
              className="col-start-1 row-start-1 w-full bg-transparent border-none outline-none p-0 font-semibold text-[18px] text-text"
            />
          </div>
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            title="Double click to rename"
            aria-label={`App name: ${currentAppName}. Double click to rename`}
            className="cursor-pointer select-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {currentAppName}
          </span>
        )}
      </h1>

      <div
        className={`flex items-center gap-1 transition-opacity ${isMenuOpen
          ? "opacity-100"
          : "opacity-0 group-hover/header:opacity-100 group-focus-within/header:opacity-100 touch-visible"
          }`}
      >
        {/* Add bookmark button */}
        <button
          type="button"
          aria-label="Add bookmark"
          onClick={onOpenAddBookmark}
          className="size-8 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
        >
          <Plus strokeWidth={1.5} className="size-4" />
        </button>

        {/* Top-right menu */}
        <DropdownMenu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="size-8 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
            >
              <Ellipsis strokeWidth={1.5} className="size-4" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="min-w-[210px] bg-surface border border-surface-border rounded-xl shadow-lg p-1 text-[14px] text-text z-50 focus:outline-none"
            >
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  handleExport();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
              >
                <Download strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                <span>Export JSON</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  handleImportClick();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
              >
                <Upload strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                <span>Import JSON</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  handleExportCSV();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                <span>Export CSV</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  handleImportCSVClick();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
              >
                <FileUp strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                <span>Import CSV</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-surface-border my-1" />

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setAppearance("icon-only");
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Image strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  <span>Icon only</span>
                </div>
                {appearance === "icon-only" && (
                  <Check strokeWidth={1.5} className="size-4 text-text shrink-0" />
                )}
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setAppearance("compact");
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <List strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  <span>Compact</span>
                </div>
                {appearance === "compact" && (
                  <Check strokeWidth={1.5} className="size-4 text-text shrink-0" />
                )}
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setAppearance("relaxed");
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutList strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  <span>Relaxed</span>
                </div>
                {appearance === "relaxed" && (
                  <Check strokeWidth={1.5} className="size-4 text-text shrink-0" />
                )}
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-surface-border my-1" />

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  toggleUseDividers();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <SeparatorHorizontal strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  <span>Use dividers</span>
                </div>
                <span
                  className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                    useDividers ? "bg-text justify-end" : "bg-text-faint/40 justify-start"
                  }`}
                >
                  <span className="size-3 rounded-full bg-surface shadow-xs" />
                </span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isDarkModeActive ? (
                    <Sun strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  ) : (
                    <Moon strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                  )}
                  <span>Dark mode</span>
                </div>
                <span
                  className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${isDarkModeActive ? "bg-text justify-end" : "bg-text-faint/40 justify-start"
                    }`}
                >
                  <span className="size-3 rounded-full bg-surface shadow-xs" />
                </span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={onOpenPrivacyModal}
                className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
              >
                <ShieldCheck strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                <span>Privacy note</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Hidden file input for JSON import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Hidden file input for CSV import */}
        <input
          ref={csvFileInputRef}
          type="file"
          accept=".csv,text/csv,text/comma-separated-values"
          onChange={handleCSVFileChange}
          className="hidden"
        />
      </div>
    </header>
  );
}
