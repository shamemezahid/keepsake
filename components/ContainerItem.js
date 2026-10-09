"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { GripVertical, Ellipsis, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { BookmarkCard } from "./BookmarkCard";
import { useStore } from "@/hooks/useStore";

export function ContainerItem({
  container,
  onEditBookmark,
  onDeleteBookmark,
  onDeleteContainer,
  onAddBookmarkToContainer,
  autoFocusRename = false,
  isOverlay = false,
}) {
  const {
    renameContainer,
    toggleContainerCollapse,
    deleteContainer,
    useDividers,
    appearance,
  } = useStore();

  const [isEditing, setIsEditing] = useState(autoFocusRename);
  const [prevTitle, setPrevTitle] = useState(container.title);
  const [titleDraft, setTitleDraft] = useState(container.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const clickTimerRef = useRef(null);

  // Sync draft title if container changes externally
  if (container.title !== prevTitle) {
    setPrevTitle(container.title);
    if (!isEditing) {
      setTitleDraft(container.title);
    }
  }

  // Sortable setup for container reordering
  const {
    attributes,
    listeners,
    setNodeRef: setContainerRef,
    transform,
    transition,
    isDragging: isContainerDragging,
  } = useSortable({
    id: `c_${container.id}`,
    data: {
      type: "container",
      container,
    },
    disabled: isOverlay,
  });

  // Droppable setup for empty container dropping
  const { setNodeRef: setEmptyDroppableRef, isOver: isOverEmpty } = useDroppable({
    id: `c_empty_${container.id}`,
    data: {
      type: "container_empty",
      containerId: container.id,
      isCollapsed: container.collapsed,
    },
    disabled: container.collapsed || container.bookmarks.length > 0 || isOverlay,
  });

  const containerStyle = isOverlay
    ? {}
    : {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isContainerDragging ? 0.25 : 1,
    };

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
  };

  useEffect(() => {
    if (autoFocusRename) {
      startEditing();
    }
  }, [autoFocusRename]);

  const commitRename = () => {
    setIsEditing(false);
    const trimmed = titleDraft.trim();
    if (trimmed !== container.title) {
      renameContainer(container.id, trimmed);
    }
  };

  const handleTitleClick = () => {
    if (isEditing) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      toggleContainerCollapse(container.id);
      clickTimerRef.current = null;
    }, 250);
  };

  const handleTitleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    startEditing();
  };

  const handleTitleKeyDown = (e) => {
    if (isEditing) return;
    if (e.key === "F2") {
      e.preventDefault();
      startEditing();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleContainerCollapse(container.id);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setTitleDraft(container.title);
    }
  };

  // If this is a drag overlay for the container, show only the title row
  if (isOverlay) {
    return (
      <div className="bg-surface border border-surface-border rounded-xl px-4 py-2.5 shadow-xl flex items-center justify-between min-w-[280px]">
        <span className="text-[16px] font-medium text-text">{container.title || "Untitled"}</span>
        <GripVertical strokeWidth={1.5} className="size-4 text-text-faint" />
      </div>
    );
  }

  const bookmarkIds = container.bookmarks.map((b) => `b_${b.id}`);

  return (
    <div ref={setContainerRef} style={containerStyle} className="group/container">
      {/* Container Header */}
      {useDividers ? (
        <div className="relative flex items-center justify-between mb-2 min-h-[24px] px-4 group/header">
          {/* Thin low-contrast line divider across the container */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Container: ${container.title || "Untitled"}. Click to ${
              container.collapsed ? "expand" : "collapse"
            }`}
            aria-expanded={!container.collapsed}
            onClick={handleTitleClick}
            onDoubleClick={handleTitleDoubleClick}
            onKeyDown={handleTitleKeyDown}
            title={container.title ? `${container.title} (click to toggle)` : "Click to toggle"}
            className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[1px] bg-text/10 dark:bg-text/12 group-hover/container:bg-text/25 dark:group-hover/container:bg-text/25 transition-colors cursor-pointer"
          />

          {/* Left tools: Grip handle & Chevron */}
          <div
            className={`relative z-10 flex items-center gap-0.5 bg-bg pr-1 rounded-md transition-opacity ${
              container.collapsed
                ? "opacity-100"
                : "opacity-0 group-hover/container:opacity-100 group-focus-within/container:opacity-100 touch-visible"
            }`}
          >
            {/* Grip handle activator for container reordering on left */}
            <button
              type="button"
              aria-label={`Drag to reorder container ${container.title || "Untitled"}`}
              {...attributes}
              {...listeners}
              className="size-6 flex-shrink-0 flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-grab active:cursor-grabbing touch-none rounded-md transition-colors"
            >
              <GripVertical strokeWidth={1.5} className="size-3.5" />
            </button>

            {/* Chevron toggle button */}
            <button
              type="button"
              aria-label={container.collapsed ? "Expand container" : "Collapse container"}
              aria-expanded={!container.collapsed}
              onClick={() => toggleContainerCollapse(container.id)}
              className="size-6 flex-shrink-0 flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer rounded-md transition-colors"
            >
              <ChevronDown
                strokeWidth={1.5}
                className={`size-3.5 transition-transform duration-200 ${
                  container.collapsed ? "-rotate-90" : "rotate-0"
                }`}
              />
            </button>
          </div>

          {/* Center editing input if renaming */}
          {isEditing && (
            <div className="relative z-10 flex-1 max-w-xs mx-2">
              <input
                ref={inputRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleInputKeyDown}
                placeholder="Container name"
                className="w-full bg-surface border border-surface-border rounded-md px-2 py-0.5 text-[13px] font-medium text-text placeholder:text-text-faint/60 outline-none focus:ring-1 focus:ring-focus-ring shadow-xs"
              />
            </div>
          )}

          {/* Right tools: Plus & Ellipsis */}
          <div
            className={`relative z-10 flex items-center gap-0.5 bg-bg pl-1 rounded-md transition-opacity ${
              isMenuOpen
                ? "opacity-100"
                : "opacity-0 group-hover/container:opacity-100 group-focus-within/container:opacity-100 touch-visible"
            }`}
          >
            {/* Plus icon to add cards under this specific container */}
            <button
              type="button"
              aria-label={`Add bookmark to ${container.title || "container"}`}
              onClick={() => onAddBookmarkToContainer(container.id)}
              className="size-6 rounded-md flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
            >
              <Plus strokeWidth={1.5} className="size-3.5" />
            </button>

            {/* Ellipsis menu */}
            <DropdownMenu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Options for container ${container.title || "container"}`}
                  className="size-6 rounded-md flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
                >
                  <Ellipsis strokeWidth={1.5} className="size-3.5" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[160px] bg-surface border border-surface-border rounded-xl shadow-lg p-1 text-[14px] text-text z-50 focus:outline-none"
                >
                  <DropdownMenu.Item
                    onSelect={() => startEditing()}
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Pencil strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                    <span>Rename</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() =>
                      onDeleteContainer
                        ? onDeleteContainer(container)
                        : deleteContainer(container.id)
                    }
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2
                      strokeWidth={1.5}
                      className="size-4 shrink-0 text-red-700 dark:text-red-400"
                    />
                    <span>Delete container</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3 min-h-[32px] px-4">
          <div className="relative flex items-center py-2 min-h-[32px]">
            {/* Grip handle activator for container reordering on left */}
            <button
              type="button"
              aria-label={`Drag to reorder container ${container.title || "Untitled"}`}
              {...attributes}
              {...listeners}
              className="absolute right-full mr-2 size-5 flex-shrink-0 flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-grab active:cursor-grabbing touch-none rounded-md transition-opacity opacity-0 group-hover/container:opacity-100 group-focus-within/container:opacity-100 touch-visible"
            >
              <GripVertical strokeWidth={1.5} className="size-4" />
            </button>

            {isEditing ? (
              <div className="inline-grid items-center min-w-[80px] -ml-1">
                <span className="invisible whitespace-pre font-medium text-[16px] col-start-1 row-start-1 px-1 py-0 select-none">
                  {titleDraft || "Container"}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Container name"
                  className="col-start-1 row-start-1 w-full bg-transparent border-none outline-none px-1 py-0 font-medium text-[16px] text-text placeholder:text-text-faint/60"
                />
              </div>
            ) : (
              <button
                type="button"
                aria-expanded={!container.collapsed}
                onClick={handleTitleClick}
                onDoubleClick={handleTitleDoubleClick}
                onKeyDown={handleTitleKeyDown}
                className="text-[16px] font-medium text-text hover:text-text cursor-pointer rounded-md text-left select-none min-w-[80px] min-h-[28px] inline-flex items-center px-1.5 -mx-1.5 hover:bg-hover/40 transition-colors"
              >
                {container.title || (
                  <span className="opacity-0 group-hover/container:opacity-100 text-text-faint/50 text-[14px] italic transition-opacity">
                    Untitled
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Action cluster on the right */}
          <div
            className={`flex items-center gap-1 transition-opacity ${
              isMenuOpen
                ? "opacity-100"
                : "opacity-0 group-hover/container:opacity-100 group-focus-within/container:opacity-100 touch-visible"
            }`}
          >
            {/* Plus icon to add cards under this specific container */}
            <button
              type="button"
              aria-label={`Add bookmark to ${container.title || "container"}`}
              onClick={() => onAddBookmarkToContainer(container.id)}
              className="size-8 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
            >
              <Plus strokeWidth={1.5} className="size-4" />
            </button>

            {/* Ellipsis menu */}
            <DropdownMenu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Options for container ${container.title || "container"}`}
                  className="size-8 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-hover cursor-pointer transition-colors"
                >
                  <Ellipsis strokeWidth={1.5} className="size-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[160px] bg-surface border border-surface-border rounded-xl shadow-lg p-1 text-[14px] text-text z-50 focus:outline-none"
                >
                  <DropdownMenu.Item
                    onSelect={() => startEditing()}
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Pencil strokeWidth={1.5} className="size-4 shrink-0 text-text-subtle" />
                    <span>Rename</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() =>
                      onDeleteContainer
                        ? onDeleteContainer(container)
                        : deleteContainer(container.id)
                    }
                    className="px-3 py-2 rounded-lg hover:bg-hover focus:bg-hover outline-none cursor-pointer text-text flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2
                      strokeWidth={1.5}
                      className="size-4 shrink-0 text-red-700 dark:text-red-400"
                    />
                    <span>Delete container</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}

      {/* Collapsible Content Wrapper (animated grid-template-rows 0fr to 1fr) */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${container.collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
      >
        <div
          className="overflow-hidden min-h-0"
          inert={container.collapsed ? true : undefined}
          aria-hidden={container.collapsed ? "true" : undefined}
        >
          {container.bookmarks.length > 0 ? (
            <SortableContext items={bookmarkIds} strategy={rectSortingStrategy}>
              <div
                className={
                  appearance === "icon-only"
                    ? "flex flex-row flex-wrap gap-1"
                    : "grid grid-cols-[repeat(auto-fill,minmax(256px,1fr))] gap-1"
                }
              >
                {container.bookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    containerId={container.id}
                    onEdit={onEditBookmark}
                    onDelete={onDeleteBookmark}
                  />
                ))}
              </div>
            </SortableContext>
          ) : (
            <div
              ref={setEmptyDroppableRef}
              className={`flex items-center justify-center text-center ${
                useDividers ? "py-4" : "py-8"
              } rounded-xl transition-colors ${isOverEmpty ? "bg-hover" : ""}`}
            >
              <span className="text-[14px] text-text-faint">
                No bookmarks added for this container.{" "}
                <button
                  type="button"
                  onClick={() => onAddBookmarkToContainer(container.id)}
                  className="underline hover:text-text cursor-pointer ml-1 text-text-subtle"
                >
                  Add now
                </button>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
