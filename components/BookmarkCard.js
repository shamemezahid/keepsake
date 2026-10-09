"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Globe, GripVertical, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { getHostname, getDisplayHostname } from "@/lib/url";
import { useStore } from "@/hooks/useStore";

export function BookmarkCard({
  bookmark,
  containerId,
  onEdit,
  onDelete,
  isOverlay = false,
  appearance: propAppearance,
}) {
  const store = useStore();
  const rawAppearance = propAppearance || store?.appearance || "relaxed";
  const appearance = rawAppearance === "extended" ? "relaxed" : rawAppearance;
  const [hasIconError, setHasIconError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `b_${bookmark.id}`,
    data: {
      type: "bookmark",
      bookmark,
      containerId,
    },
    disabled: isOverlay,
  });

  const style = isOverlay
    ? {}
    : {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.25 : 1,
    };

  const hostname = getHostname(bookmark.url);
  const subtitle = bookmark.description ? bookmark.description : getDisplayHostname(bookmark.url);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-2xl px-4 py-3 transition-colors touch-no-swap ${isOverlay ? "bg-hover shadow-md cursor-grabbing" : "hover:bg-hover"
        }`}
    >
      <div
        className={`flex items-center ${
          appearance === "icon-only" ? "gap-2 py-1" : "py-2 gap-4"
        }`}
      >
        {/* Favicon / Drag handle activator */}
        <button
          type="button"
          aria-label={`Drag to reorder ${bookmark.title}`}
          {...attributes}
          {...listeners}
          className="relative z-10 size-5 flex-shrink-0 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing rounded-md favicon-slot mt-0.5"
        >
          {/* Favicon or fallback globe */}
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 favicon-img ${isDragging ? "opacity-0" : "group-hover:opacity-0 group-focus-within:opacity-0"
              }`}
          >
            {hasIconError || !hostname ? (
              <Globe strokeWidth={1} className="size-5 text-text-faint" />
            ) : (
              <img
                src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setHasIconError(true)}
                className="size-8 rounded-2xl object-contain p-3 min-w-12 min-h-12"
              />
            )}
          </span>

          {/* GripVertical handle on hover/drag */}
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 grip-handle text-text-faint ${isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              }`}
          >
            <GripVertical strokeWidth={1.5} className="size-4" />
          </span>
        </button>

        {/* Content area: Title + Subtitle */}
        <div className={appearance === "icon-only" ? "min-w-0" : "flex-1 min-w-0 pr-1"}>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            title={bookmark.title}
            className="block font-semibold text-[16px] text-text truncate after:absolute after:inset-0 after:content-[''] after:z-0 outline-none"
          >
            {appearance === "icon-only" ? (
              <span className="sr-only">{bookmark.title}</span>
            ) : (
              bookmark.title
            )}
          </a>
          {appearance === "relaxed" && (
            <p className="text-[14px] text-text-subtle line-clamp-2 leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action menu button */}
        {!isOverlay && (
          <div className="relative z-10 flex-shrink-0">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Options for ${bookmark.title}`}
                  className="size-7 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-hover opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 touch-visible transition-opacity cursor-pointer"
                >
                  <Ellipsis strokeWidth={1.5} className="size-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[130px] bg-surface border border-surface-border rounded-xl shadow-lg p-1 text-[14px] text-text z-50 focus:outline-none"
                >
                  <DropdownMenu.Item
                    onSelect={() => onEdit?.(bookmark, containerId)}
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Pencil strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                    <span>Edit</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => onDelete?.(containerId, bookmark.id)}
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2 strokeWidth={1.5} className="size-4 shrink-0 text-red-700 dark:text-red-400" />
                    <span>Delete</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>
    </div>
  );
}
