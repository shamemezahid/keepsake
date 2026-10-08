'use client';
import { useState, useRef, useEffect } from 'react';
import { GripVertical, Ellipsis } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import BookmarkCard from './BookmarkCard';

export default function ContainerBlock({
  container,
  onUpdateTitle,
  onDelete,
  onAddBookmark,
  onEditBookmark,
  onDeleteBookmark,
  isOverlay = false,
  activeBookmarkId,
  autoFocusEdit = false,
  onAutoFocusDone,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const titleBtnRef = useRef(null);
  const singleClickTimer = useRef(null);
  const hasAutoFocused = useRef(false);

  const { collapsed } = container;

  const {
    attributes: sortableAttr,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `c_${container.id}`,
    data: { type: 'container', containerId: container.id },
  });

  const sortableStyle = isOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  // Droppable zone for empty containers
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop_${container.id}`,
    data: { type: 'containerBody', containerId: container.id },
    disabled: collapsed,
  });

  // Auto-focus on creation
  useEffect(() => {
    if (autoFocusEdit && !hasAutoFocused.current) {
      hasAutoFocused.current = true;
      startEdit();
      onAutoFocusDone?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusEdit]);

  function startEdit() {
    setEditValue(container.title);
    setEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  }

  function commitEdit() {
    const val = editValue.trim() || container.title;
    onUpdateTitle(container.id, val);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditValue(container.title);
  }

  function handleTitleClick() {
    if (editing) return;
    if (singleClickTimer.current) {
      clearTimeout(singleClickTimer.current);
      singleClickTimer.current = null;
      // Double click — start editing
      startEdit();
      return;
    }
    singleClickTimer.current = setTimeout(() => {
      singleClickTimer.current = null;
      // Single click — toggle collapse
      onUpdateTitle(container.id, container.title, { collapsed: !collapsed });
    }, 250);
  }

  function handleKeyDown(e) {
    if (e.key === 'F2' && !editing) {
      e.preventDefault();
      startEdit();
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  // Auto-size input to content
  const [inputWidth, setInputWidth] = useState(100);
  const measurer = useRef(null);
  useEffect(() => {
    if (editing && measurer.current) {
      setInputWidth(measurer.current.offsetWidth + 8);
    }
  }, [editing, editValue]);

  const bookmarkIds = container.bookmarks.map(b => `b_${b.id}`);

  return (
    <div
      ref={isOverlay ? undefined : setSortableRef}
      style={sortableStyle}
    >
      {/* Container header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          position: 'relative',
        }}
        className="container-header"
        onKeyDown={handleKeyDown}
      >
        {/* Title area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Hidden measurer for auto-width */}
              <span
                ref={measurer}
                aria-hidden
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  fontSize: '16px',
                  fontWeight: 500,
                  whiteSpace: 'pre',
                  fontFamily: 'inherit',
                  pointerEvents: 'none',
                  top: 0,
                  left: 0,
                }}
              >
                {editValue || ' '}
              </span>
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={commitEdit}
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  margin: 0,
                  width: `${Math.max(inputWidth, 60)}px`,
                  minWidth: '60px',
                }}
              />
            </div>
          ) : (
            <button
              ref={titleBtnRef}
              aria-expanded={!collapsed}
              onClick={handleTitleClick}
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--text)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              {container.title}
            </button>
          )}
        </div>

        {/* Action cluster — shown on hover / focus-within */}
        <div
          className="container-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 150ms',
          }}
        >
          {/* Container drag handle */}
          <button
            {...(isOverlay ? {} : sortableListeners)}
            {...(isOverlay ? {} : sortableAttr)}
            aria-label={`Drag to reorder ${container.title}`}
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: isSortableDragging ? 'grabbing' : 'grab',
              borderRadius: '5px',
              color: 'var(--text-faint)',
              touchAction: 'none',
            }}
          >
            <GripVertical size={16} strokeWidth={1.5} />
          </button>

          {/* Ellipsis menu */}
          <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Container options"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  color: 'var(--text-faint)',
                }}
              >
                <Ellipsis size={16} strokeWidth={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  padding: '4px',
                  minWidth: '160px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  zIndex: 100,
                  fontFamily: 'inherit',
                }}
              >
                <DropdownMenu.Item
                  onSelect={startEdit}
                  className="menu-item"
                  style={menuItemStyle}
                >
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => onDelete(container.id)}
                  className="menu-item"
                  style={menuItemStyle}
                >
                  Delete container
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Collapsible body */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          transition: 'grid-template-rows 200ms ease',
          marginTop: collapsed ? 0 : '12px',
        }}
        aria-hidden={collapsed || undefined}
      >
        <div
          style={{
            overflow: 'hidden',
            minHeight: 0,
            padding: '2px', // prevents focus ring clipping
          }}
          {...(collapsed ? { inert: '' } : {})}
        >
          <SortableContext items={bookmarkIds} strategy={rectSortingStrategy}>
            {container.bookmarks.length === 0 ? (
              <div
                ref={setDropRef}
                style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  fontSize: '14px',
                  color: 'var(--text-faint)',
                  background: isOver ? 'var(--hover)' : 'transparent',
                  borderRadius: '8px',
                  transition: 'background 150ms',
                }}
              >
                No bookmarks added for this container.{' '}
                <button
                  onClick={() => onAddBookmark(container.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-faint)',
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                  }}
                >
                  Add now
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {container.bookmarks.map(bookmark => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    containerId={container.id}
                    onEdit={() => onEditBookmark(bookmark, container.id)}
                    onDelete={() => onDeleteBookmark(container.id, bookmark.id)}
                    isDragging={activeBookmarkId === bookmark.id}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </div>
      </div>

      <style>{`
        .container-header:hover .container-actions,
        .container-header:focus-within .container-actions {
          opacity: 1 !important;
        }
        @media (hover: none) {
          .container-actions { opacity: 1 !important; }
        }
        .menu-item {
          padding: 7px 10px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text);
          outline: none;
          user-select: none;
          font-family: inherit;
        }
        .menu-item:hover,
        .menu-item[data-highlighted] {
          background: var(--hover);
        }
      `}</style>
    </div>
  );
}

// Overlay for container drag
export function ContainerOverlay({ container }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        cursor: 'grabbing',
      }}
    >
      <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
        {container.title}
      </span>
    </div>
  );
}

const menuItemStyle = {
  padding: '7px 10px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--text)',
  outline: 'none',
  userSelect: 'none',
};
