"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { ContainerItem } from "./ContainerItem";
import { BookmarkCard } from "./BookmarkCard";
import { useStore } from "@/hooks/useStore";

export function ContainerList({
  onEditBookmark,
  onDeleteBookmark,
  onDeleteContainer,
  onAddBookmarkToContainer,
}) {
  const { containers, setContainers, addContainer, useDividers, appearance } = useStore();

  const [activeDragItem, setActiveDragItem] = useState(null);
  const [newlyAddedContainerId, setNewlyAddedContainerId] = useState(null);
  const initialDragContainersRef = useRef(null);

  const containersRef = useRef(containers);
  const recentlyMovedToNewContainer = useRef(false);
  const lastOverId = useRef(null);

  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [containers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = useCallback((id, containerList) => {
    if (!id) return null;
    const list = containerList || containersRef.current;
    const strId = String(id);

    if (strId.startsWith("c_empty_")) {
      const actualId = strId.replace("c_empty_", "");
      return list.find((c) => c.id === actualId) || null;
    }

    if (strId.startsWith("c_")) {
      const actualId = strId.replace("c_", "");
      return list.find((c) => c.id === actualId) || null;
    }

    if (strId.startsWith("b_")) {
      const actualId = strId.replace("b_", "");
      return (
        list.find((c) => c.bookmarks.some((b) => b.id === actualId)) ||
        null
      );
    }

    return null;
  }, []);

  const collisionDetection = useCallback(
    (args) => {
      const { active } = args;
      if (!active) return [];

      const activeId = String(active.id);
      const currentContainers = containersRef.current;

      // 1. Container reordering: only test collisions against other container wrappers
      if (activeId.startsWith("c_")) {
        const containerDroppables = args.droppableContainers.filter(
          (entry) =>
            String(entry.id).startsWith("c_") &&
            !String(entry.id).startsWith("c_empty_")
        );
        return closestCenter({
          ...args,
          droppableContainers: containerDroppables,
        });
      }

      // 2. Active item is a bookmark (starts with "b_")
      // Filter out droppables in collapsed containers
      const uncollapsedDroppables = args.droppableContainers.filter((entry) => {
        const cont = findContainer(entry.id, currentContainers);
        return cont && !cont.collapsed;
      });

      // Pointer intersections first
      const pointerIntersections = pointerWithin({
        ...args,
        droppableContainers: uncollapsedDroppables,
      });

      // Fallback to bounding rect intersections
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection({
              ...args,
              droppableContainers: uncollapsedDroppables,
            });

      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        // If collision is a container wrapper, resolve to the closest bookmark inside it
        if (
          String(overId).startsWith("c_") &&
          !String(overId).startsWith("c_empty_")
        ) {
          const container = currentContainers.find(
            (c) => `c_${c.id}` === String(overId)
          );
          if (container) {
            if (container.bookmarks.length > 0) {
              const containerBookmarkDroppables = uncollapsedDroppables.filter(
                (entry) =>
                  String(entry.id).startsWith("b_") &&
                  String(entry.id) !== activeId &&
                  container.bookmarks.some((b) => `b_${b.id}` === String(entry.id))
              );
              if (containerBookmarkDroppables.length > 0) {
                const closest = closestCenter({
                  ...args,
                  droppableContainers: containerBookmarkDroppables,
                });
                if (closest.length > 0) {
                  overId = closest[0].id;
                }
              }
            } else {
              // Empty container: target its empty placeholder droppable
              overId = `c_empty_${container.id}`;
            }
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // When dragging outside any container / in whitespace
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [findContainer]
  );

  const handleDragStart = (event) => {
    const { active } = event;
    initialDragContainersRef.current = containersRef.current;
    recentlyMovedToNewContainer.current = false;
    lastOverId.current = null;

    const activeId = String(active.id);
    if (activeId.startsWith("c_")) {
      const containerId = activeId.replace("c_", "");
      const c = containersRef.current.find((item) => item.id === containerId);
      if (c) {
        setActiveDragItem({ type: "container", container: c, id: activeId });
      }
    } else if (activeId.startsWith("b_")) {
      const bookmarkId = activeId.replace("b_", "");
      const parentContainer = findContainer(activeId, containersRef.current);
      const b = parentContainer?.bookmarks.find((item) => item.id === bookmarkId);
      if (b && parentContainer) {
        setActiveDragItem({
          type: "bookmark",
          bookmark: b,
          containerId: parentContainer.id,
          id: activeId,
        });
      }
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Only move bookmarks across containers during dragOver
    if (!activeId.startsWith("b_")) return;

    const currentContainers = containersRef.current;
    const activeContainer = findContainer(activeId, currentContainers);
    const overContainer = findContainer(overId, currentContainers);

    if (!activeContainer || !overContainer) return;
    if (activeContainer.id === overContainer.id) return;
    if (overContainer.collapsed) return;

    // Guard against multi-container bounce before layout settles
    if (recentlyMovedToNewContainer.current) return;

    const activeContIndex = currentContainers.findIndex(
      (c) => c.id === activeContainer.id
    );
    const overContIndex = currentContainers.findIndex(
      (c) => c.id === overContainer.id
    );
    if (activeContIndex === -1 || overContIndex === -1) return;

    const sourceBookmarks = [...currentContainers[activeContIndex].bookmarks];
    const destBookmarks = [...currentContainers[overContIndex].bookmarks];

    const sourceIndex = sourceBookmarks.findIndex((b) => `b_${b.id}` === activeId);
    if (sourceIndex === -1) return;

    const [movedBookmark] = sourceBookmarks.splice(sourceIndex, 1);

    let insertIndex = destBookmarks.length;
    if (overId.startsWith("b_")) {
      const overIndex = destBookmarks.findIndex((b) => `b_${b.id}` === overId);
      if (overIndex !== -1) {
        const isBelowOverItem = Boolean(
          over?.rect &&
            active.rect?.current?.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height / 2
        );
        insertIndex = isBelowOverItem ? overIndex + 1 : overIndex;
      }
    }

    destBookmarks.splice(insertIndex, 0, movedBookmark);

    recentlyMovedToNewContainer.current = true;

    const next = [...currentContainers];
    next[activeContIndex] = {
      ...next[activeContIndex],
      bookmarks: sourceBookmarks,
    };
    next[overContIndex] = {
      ...next[overContIndex],
      bookmarks: destBookmarks,
    };
    containersRef.current = next;
    setContainers(next);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);
    lastOverId.current = null;
    recentlyMovedToNewContainer.current = false;

    if (!over) {
      if (initialDragContainersRef.current) {
        containersRef.current = initialDragContainersRef.current;
        setContainers(initialDragContainersRef.current);
      }
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const currentContainers = containersRef.current;

    if (activeId.startsWith("c_")) {
      if (
        activeId !== overId &&
        overId.startsWith("c_") &&
        !overId.startsWith("c_empty_")
      ) {
        const oldIndex = currentContainers.findIndex((c) => `c_${c.id}` === activeId);
        const newIndex = currentContainers.findIndex((c) => `c_${c.id}` === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const next = arrayMove(currentContainers, oldIndex, newIndex);
          containersRef.current = next;
          setContainers(next);
        }
      }
      return;
    }

    if (activeId.startsWith("b_")) {
      const activeContainer = findContainer(activeId, currentContainers);
      const overContainer = findContainer(overId, currentContainers);

      if (!activeContainer || !overContainer) return;

      if (activeContainer.id === overContainer.id) {
        const containerIndex = currentContainers.findIndex(
          (c) => c.id === activeContainer.id
        );
        if (containerIndex === -1) return;

        const activeIndex = activeContainer.bookmarks.findIndex(
          (b) => `b_${b.id}` === activeId
        );
        const overIndex = overContainer.bookmarks.findIndex(
          (b) => `b_${b.id}` === overId
        );

        if (
          activeIndex !== -1 &&
          overIndex !== -1 &&
          activeIndex !== overIndex
        ) {
          const updatedBookmarks = arrayMove(
            activeContainer.bookmarks,
            activeIndex,
            overIndex
          );
          const next = [...currentContainers];
          next[containerIndex] = {
            ...next[containerIndex],
            bookmarks: updatedBookmarks,
          };
          containersRef.current = next;
          setContainers(next);
        }
      } else {
        // Fallback cross-container drop if dragOver did not move it
        if (!overContainer.collapsed) {
          const activeContIndex = currentContainers.findIndex(
            (c) => c.id === activeContainer.id
          );
          const overContIndex = currentContainers.findIndex(
            (c) => c.id === overContainer.id
          );
          if (activeContIndex !== -1 && overContIndex !== -1) {
            const sourceBookmarks = [...currentContainers[activeContIndex].bookmarks];
            const destBookmarks = [...currentContainers[overContIndex].bookmarks];
            const sourceIndex = sourceBookmarks.findIndex(
              (b) => `b_${b.id}` === activeId
            );
            if (sourceIndex !== -1) {
              const [movedBookmark] = sourceBookmarks.splice(sourceIndex, 1);
              let insertIndex = destBookmarks.length;
              if (overId.startsWith("b_")) {
                const overIndex = destBookmarks.findIndex(
                  (b) => `b_${b.id}` === overId
                );
                if (overIndex !== -1) {
                  insertIndex = overIndex;
                }
              }
              destBookmarks.splice(insertIndex, 0, movedBookmark);
              const next = [...currentContainers];
              next[activeContIndex] = {
                ...next[activeContIndex],
                bookmarks: sourceBookmarks,
              };
              next[overContIndex] = {
                ...next[overContIndex],
                bookmarks: destBookmarks,
              };
              containersRef.current = next;
              setContainers(next);
            }
          }
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
    lastOverId.current = null;
    recentlyMovedToNewContainer.current = false;
    if (initialDragContainersRef.current) {
      containersRef.current = initialDragContainersRef.current;
      setContainers(initialDragContainersRef.current);
    }
  };

  const handleAddContainerClick = () => {
    const newContainer = addContainer("Container");
    setNewlyAddedContainerId(newContainer.id);
  };

  const containerIds = containers.map((c) => `c_${c.id}`);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={containerIds} strategy={verticalListSortingStrategy}>
        <div className={`flex flex-col ${useDividers ? "gap-4" : "gap-10"}`}>
          {containers.map((container) => (
            <ContainerItem
              key={container.id}
              container={container}
              autoFocusRename={newlyAddedContainerId === container.id}
              onEditBookmark={onEditBookmark}
              onDeleteBookmark={onDeleteBookmark}
              onDeleteContainer={onDeleteContainer}
              onAddBookmarkToContainer={onAddBookmarkToContainer}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add Container Affordance Zone (~48px tall) */}
      <div className="h-12 flex items-center justify-start group/add-zone mt-4 px-4">
        <button
          type="button"
          onClick={handleAddContainerClick}
          className={`flex items-center gap-2 text-[14px] text-text-faint hover:text-text cursor-pointer transition-opacity ${
            containers.length === 0
              ? "opacity-100"
              : "opacity-0 group-hover/add-zone:opacity-100 focus-visible:opacity-100 touch-visible"
          }`}
        >
          <Plus strokeWidth={1.5} className="size-4" />
          <span>Add container</span>
        </button>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem?.type === "bookmark" && (
          <div className={appearance === "icon-only" ? "w-auto" : "w-[320px]"}>
            <BookmarkCard
              bookmark={activeDragItem.bookmark}
              containerId={activeDragItem.containerId}
              isOverlay
            />
          </div>
        )}
        {activeDragItem?.type === "container" && (
          <ContainerItem container={activeDragItem.container} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
