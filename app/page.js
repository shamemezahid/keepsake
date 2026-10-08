'use client';
import { useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus, Ellipsis } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';

import { useStore } from '@/hooks/useStore';
import { APP_NAME } from '@/lib/config';
import { exportData, processImport } from '@/lib/importExport';
import { generateId } from '@/lib/storage';
import ContainerBlock, { ContainerOverlay } from '@/components/ContainerBlock';
import { BookmarkCardOverlay } from '@/components/BookmarkCard';
import BookmarkModal from '@/components/BookmarkModal';
import ImportReportModal from '@/components/ImportReportModal';
import PrivacyModal from '@/components/PrivacyModal';

export default function HomePage() {
  const store = useStore();
  const {
    state,
    isLoaded,
    findDuplicate,
    setTheme,
    addContainer,
    updateContainer,
    deleteContainer,
    addBookmark,
    updateBookmark,
    moveBookmark,
    deleteBookmark,
    setContainers,
  } = store;

  // Modal state
  const [bookmarkModal, setBookmarkModal] = useState({
    open: false,
    defaultContainerId: null,
    editBookmark: null,
    editContainerId: null,
  });
  const [importReportModal, setImportReportModal] = useState({ open: false, report: null });
  const [privacyModal, setPrivacyModal] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);

  // DnD state
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [activeContainers, setActiveContainers] = useState(null); // live containers during drag

  // New container ref for rename-on-create
  const newContainerIdRef = useRef(null);
  const addContainerBtnRef = useRef(null);

  // File input for import
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Derive current containers (use live drag state if dragging)
  const containers = (activeContainers && activeId) ? activeContainers : state?.containers ?? [];

  // ── DnD handlers ──────────────────────────────────────────────────────────
  function findContainerForBookmark(bookmarkId, containerList) {
    return containerList.find(c =>
      c.bookmarks.some(b => b.id === bookmarkId || `b_${b.id}` === bookmarkId)
    );
  }

  function handleDragStart({ active }) {
    setActiveId(active.id);
    setActiveContainers(state.containers.map(c => ({ ...c, bookmarks: [...c.bookmarks] })));
  }

  function handleDragOver({ active, over }) {
    if (!over || !activeContainers) return;
    const activeIdStr = active.id;
    const overIdStr = over.id;
    if (activeIdStr === overIdStr) return;

    // Only handle bookmark drags here
    if (!activeIdStr.startsWith('b_')) return;

    const activeBookmarkId = activeIdStr.slice(2);
    const activeContainer = findContainerForBookmark(activeBookmarkId, activeContainers);
    if (!activeContainer) return;

    // Find where we're dragging over
    let overContainerId;
    let overBookmarkId;

    if (overIdStr.startsWith('c_')) {
      overContainerId = overIdStr.slice(2);
    } else if (overIdStr.startsWith('drop_')) {
      overContainerId = overIdStr.slice(5);
    } else if (overIdStr.startsWith('b_')) {
      overBookmarkId = overIdStr.slice(2);
      const overContainer = findContainerForBookmark(overBookmarkId, activeContainers);
      if (overContainer) overContainerId = overContainer.id;
    } else {
      return;
    }

    if (!overContainerId) return;
    const overContainer = activeContainers.find(c => c.id === overContainerId);
    if (!overContainer || overContainer.collapsed) return;

    if (activeContainer.id === overContainerId && !overBookmarkId) return;

    // Build updated containers
    const newContainers = activeContainers.map(c => ({ ...c, bookmarks: [...c.bookmarks] }));
    const fromIdx = newContainers.findIndex(c => c.id === activeContainer.id);
    const toIdx = newContainers.findIndex(c => c.id === overContainerId);

    // Remove from source
    const bookmarkIdx = newContainers[fromIdx].bookmarks.findIndex(b => b.id === activeBookmarkId);
    if (bookmarkIdx === -1) return;
    const [bookmark] = newContainers[fromIdx].bookmarks.splice(bookmarkIdx, 1);

    // Insert at destination
    if (overBookmarkId) {
      const destBookmarkIdx = newContainers[toIdx].bookmarks.findIndex(b => b.id === overBookmarkId);
      newContainers[toIdx].bookmarks.splice(
        destBookmarkIdx >= 0 ? destBookmarkIdx : newContainers[toIdx].bookmarks.length,
        0,
        bookmark
      );
    } else {
      newContainers[toIdx].bookmarks.push(bookmark);
    }

    setActiveContainers(newContainers);
  }

  function handleDragEnd({ active, over }) {
    const activeIdStr = active.id;
    setActiveId(null);

    if (!over) {
      setActiveContainers(null);
      return;
    }

    const overIdStr = over.id;

    if (activeIdStr.startsWith('c_')) {
      // Container reorder
      const fromIndex = containers.findIndex(c => `c_${c.id}` === activeIdStr);
      let toIndex = containers.findIndex(c => `c_${c.id}` === overIdStr);
      if (toIndex === -1) toIndex = fromIndex;
      if (fromIndex !== toIndex) {
        const newContainers = arrayMove(containers, fromIndex, toIndex);
        setContainers(newContainers);
      } else {
        setContainers([...containers]);
      }
    } else if (activeIdStr.startsWith('b_') && activeContainers) {
      // Finalize bookmark move from live state
      setContainers(activeContainers);
    }

    setActiveContainers(null);
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveContainers(null);
  }

  // Custom collision detection: containers use rectIntersection, bookmarks use closestCorners
  function collisionDetection(args) {
    if (activeId?.startsWith('c_')) {
      return rectIntersection(args);
    }
    return closestCorners(args);
  }

  // ── Bookmark actions ──────────────────────────────────────────────────────
  function openAddBookmark(defaultContainerId) {
    setBookmarkModal({ open: true, defaultContainerId, editBookmark: null, editContainerId: null });
  }

  function openEditBookmark(bookmark, containerId) {
    setBookmarkModal({ open: true, defaultContainerId: null, editBookmark: bookmark, editContainerId: containerId });
  }

  function handleBookmarkSave(result) {
    if (result.type === 'add') {
      addBookmark(result.containerId, result.bookmark);
    } else if (result.type === 'edit') {
      if (result.fromContainerId === result.toContainerId) {
        updateBookmark(result.fromContainerId, result.bookmarkId, result.updates);
      } else {
        // Move to new container: remove from old, update, add to new
        const container = state.containers.find(c => c.id === result.fromContainerId);
        const bookmark = container?.bookmarks.find(b => b.id === result.bookmarkId);
        if (bookmark) {
          // Use direct dispatch to avoid firing the undo toast
          store.dispatch({ type: 'DELETE_BOOKMARK', containerId: result.fromContainerId, bookmarkId: result.bookmarkId });
          store.dispatch({
            type: 'ADD_BOOKMARK',
            containerId: result.toContainerId,
            bookmark: { ...bookmark, ...result.updates },
          });
        }
      }
    }
  }

  // ── Container actions ─────────────────────────────────────────────────────
  function handleUpdateContainer(id, title, extraUpdates) {
    updateContainer(id, { title, ...extraUpdates });
  }

  function handleAddContainer() {
    const id = generateId();
    newContainerIdRef.current = id;
    addContainer(id, 'Container');
    // Rename mode is triggered via a useEffect watching for this id
  }

  // ── Export / Import ───────────────────────────────────────────────────────
  function handleExport() {
    exportData(state);
    toast.success('Export complete');
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target.result;
      const { newData, report } = processImport(state, raw);
      if (report.success && (report.added > 0 || report.containersCreated > 0)) {
        setContainers(newData.containers);
      }
      setImportReportModal({ open: true, report });
    };
    reader.readAsText(file);
  }

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const currentTheme = state?.settings?.theme ?? 'system';
  const isDarkActive = (() => {
    if (!isLoaded) return false;
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    // system
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  })();

  function handleThemeToggle() {
    const next = isDarkActive ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Don't render anything until loaded (avoid hydration mismatch)
  if (!isLoaded) return null;

  const containerIds = containers.map(c => `c_${c.id}`);

  // Find active item for overlay
  const activeContainer = activeId?.startsWith('c_')
    ? containers.find(c => `c_${c.id}` === activeId)
    : null;
  const activeBookmark = activeId?.startsWith('b_')
    ? (() => {
        const bid = activeId.slice(2);
        for (const c of containers) {
          const b = c.bookmarks.find(bk => bk.id === bid);
          if (b) return b;
        }
        return null;
      })()
    : null;

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', paddingLeft: '24px', paddingRight: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '32px',
            paddingBottom: '32px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
            {APP_NAME}
          </h1>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Add bookmark button */}
            <button
              id="add-bookmark-btn"
              onClick={() => openAddBookmark(containers[0]?.id)}
              aria-label="Add bookmark"
              style={iconBtnStyle}
              className="icon-btn"
            >
              <Plus size={18} strokeWidth={1.5} />
            </button>

            {/* More options ellipsis menu */}
            <DropdownMenu.Root open={mainMenuOpen} onOpenChange={setMainMenuOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  id="more-options-btn"
                  aria-label="More options"
                  style={iconBtnStyle}
                  className="icon-btn"
                >
                  <Ellipsis size={18} strokeWidth={1.5} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '10px',
                    padding: '4px',
                    minWidth: '180px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                  }}
                >
                  <DropdownMenu.Item
                    onSelect={handleExport}
                    style={mainMenuItemStyle}
                    className="main-menu-item"
                  >
                    Export JSON
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={handleImportClick}
                    style={mainMenuItemStyle}
                    className="main-menu-item"
                  >
                    Import JSON
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator style={{ height: '1px', background: 'var(--surface-border)', margin: '4px 0' }} />
                  <DropdownMenu.Item
                    onSelect={handleThemeToggle}
                    style={{ ...mainMenuItemStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    className="main-menu-item"
                  >
                    <span>Dark mode</span>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: '1px solid var(--surface-border)',
                      background: isDarkActive ? 'var(--text)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isDarkActive && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator style={{ height: '1px', background: 'var(--surface-border)', margin: '4px 0' }} />
                  <DropdownMenu.Item
                    onSelect={() => setPrivacyModal(true)}
                    style={mainMenuItemStyle}
                    className="main-menu-item"
                  >
                    Privacy note
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        {/* Main content */}
        <main>
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={containerIds} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {containers.map((container) => (
                  <ContainerBlock
                    key={container.id}
                    container={container}
                    onUpdateTitle={(id, title, extra) => updateContainer(id, { title, ...extra })}
                    onDelete={deleteContainer}
                    onAddBookmark={openAddBookmark}
                    onEditBookmark={openEditBookmark}
                    onDeleteBookmark={deleteBookmark}
                    activeBookmarkId={activeId?.startsWith('b_') ? activeId.slice(2) : null}
                    autoFocusEdit={newContainerIdRef.current === container.id}
                    onAutoFocusDone={() => { newContainerIdRef.current = null; }}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeContainer && <ContainerOverlay container={activeContainer} />}
              {activeBookmark && <BookmarkCardOverlay bookmark={activeBookmark} />}
            </DragOverlay>
          </DndContext>

          {/* Add container zone */}
          <AddContainerZone onClick={handleAddContainer} />
        </main>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-hidden
        tabIndex={-1}
      />

      {/* Modals */}
      <BookmarkModal
        open={bookmarkModal.open}
        onClose={() => setBookmarkModal(s => ({ ...s, open: false }))}
        onSave={handleBookmarkSave}
        containers={containers}
        defaultContainerId={bookmarkModal.defaultContainerId}
        editBookmark={bookmarkModal.editBookmark}
        editContainerId={bookmarkModal.editContainerId}
        findDuplicate={findDuplicate}
      />

      <ImportReportModal
        open={importReportModal.open}
        onClose={() => setImportReportModal({ open: false, report: null })}
        report={importReportModal.report}
      />

      <PrivacyModal
        open={privacyModal}
        onClose={() => setPrivacyModal(false)}
      />

      <style>{`
        .icon-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 6px;
          color: var(--text);
          transition: background 120ms;
        }
        .icon-btn:hover {
          background: var(--hover);
        }
        .main-menu-item {
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text);
          outline: none;
          user-select: none;
          font-family: inherit;
        }
        .main-menu-item:hover,
        .main-menu-item[data-highlighted] {
          background: var(--hover);
        }
        .add-container-zone {
          height: 48px;
          display: flex;
          align-items: center;
          margin-top: 40px;
          margin-bottom: 32px;
        }
        .add-container-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 8px 4px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-faint);
          font-family: inherit;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 150ms;
        }
        .add-container-zone:hover .add-container-btn,
        .add-container-btn:focus-visible {
          opacity: 1;
        }
        @media (hover: none) {
          .add-container-btn { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}

function AddContainerZone({ onClick }) {
  return (
    <div className="add-container-zone">
      <button
        id="add-container-btn"
        className="add-container-btn"
        onClick={onClick}
        aria-label="Add container"
      >
        <Plus size={16} strokeWidth={1.5} />
        Add container
      </button>
    </div>
  );
}

const iconBtnStyle = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  borderRadius: '6px',
  color: 'var(--text)',
};

const mainMenuItemStyle = {
  padding: '8px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--text)',
  outline: 'none',
  userSelect: 'none',
  fontFamily: 'inherit',
  display: 'block',
  width: '100%',
};
