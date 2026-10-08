'use client';
import { useReducer, useEffect, useRef, useCallback } from 'react';
import { STORAGE_KEY } from '@/lib/config';
import { loadData, scheduleSave, flushSave, generateId, createDefaultData } from '@/lib/storage';
import { normalizeForDupe } from '@/lib/url';
import { toast } from 'sonner';

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.data;

    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: action.theme } };

    // ── CONTAINERS ──────────────────────────────────────────────────────────
    case 'ADD_CONTAINER': {
      const newContainer = {
        id: action.id || generateId(),
        title: action.title || 'Container',
        collapsed: false,
        bookmarks: [],
      };
      return { ...state, containers: [...state.containers, newContainer] };
    }

    case 'UPDATE_CONTAINER': {
      return {
        ...state,
        containers: state.containers.map(c =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
      };
    }

    case 'DELETE_CONTAINER': {
      return {
        ...state,
        containers: state.containers.filter(c => c.id !== action.id),
      };
    }

    case 'REORDER_CONTAINERS': {
      return { ...state, containers: action.containers };
    }

    // ── BOOKMARKS ───────────────────────────────────────────────────────────
    case 'ADD_BOOKMARK': {
      return {
        ...state,
        containers: state.containers.map(c =>
          c.id === action.containerId
            ? { ...c, bookmarks: [...c.bookmarks, action.bookmark] }
            : c
        ),
      };
    }

    case 'UPDATE_BOOKMARK': {
      return {
        ...state,
        containers: state.containers.map(c => {
          if (c.id === action.containerId) {
            return {
              ...c,
              bookmarks: c.bookmarks.map(b =>
                b.id === action.bookmarkId ? { ...b, ...action.updates } : b
              ),
            };
          }
          return c;
        }),
      };
    }

    case 'MOVE_BOOKMARK': {
      // Remove from source, insert at target
      const { bookmarkId, fromContainerId, toContainerId, toIndex } = action;
      let bookmark = null;

      const containers = state.containers.map(c => {
        if (c.id === fromContainerId) {
          const idx = c.bookmarks.findIndex(b => b.id === bookmarkId);
          if (idx !== -1) {
            bookmark = c.bookmarks[idx];
            return { ...c, bookmarks: c.bookmarks.filter(b => b.id !== bookmarkId) };
          }
        }
        return c;
      });

      if (!bookmark) return state;

      const finalContainers = containers.map(c => {
        if (c.id === toContainerId) {
          const newBookmarks = [...c.bookmarks];
          const insertAt = toIndex !== undefined ? toIndex : newBookmarks.length;
          newBookmarks.splice(insertAt, 0, bookmark);
          return { ...c, bookmarks: newBookmarks };
        }
        return c;
      });

      return { ...state, containers: finalContainers };
    }

    case 'DELETE_BOOKMARK': {
      return {
        ...state,
        containers: state.containers.map(c =>
          c.id === action.containerId
            ? { ...c, bookmarks: c.bookmarks.filter(b => b.id !== action.bookmarkId) }
            : c
        ),
      };
    }

    case 'SET_CONTAINERS': {
      return { ...state, containers: action.containers };
    }

    default:
      return state;
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, null);
  const stateRef = useRef(state);
  const isLoadedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load on mount
  useEffect(() => {
    const { data, error } = loadData();
    if (error) {
      toast.error(error);
    }
    dispatch({ type: 'LOAD', data });
    isLoadedRef.current = true;
  }, []);

  // Persist on state change (debounced)
  useEffect(() => {
    if (!isLoadedRef.current || !state) return;
    scheduleSave(state);
  }, [state]);

  // Flush on page hide
  useEffect(() => {
    const flush = () => {
      if (stateRef.current) flushSave(stateRef.current);
    };
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue);
        dispatch({ type: 'LOAD', data: incoming });
      } catch {
        // ignore corrupt cross-tab data
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── Helper: find duplicate URL ──────────────────────────────────────────
  const findDuplicate = useCallback((url, excludeBookmarkId = null) => {
    if (!state) return null;
    const normalized = normalizeForDupe(url);
    for (const container of state.containers) {
      for (const bookmark of container.bookmarks) {
        if (bookmark.id === excludeBookmarkId) continue;
        if (normalizeForDupe(bookmark.url) === normalized) {
          return { bookmark, container };
        }
      }
    }
    return null;
  }, [state]);

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  const setTheme = useCallback((theme) => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  const addContainer = useCallback((id, title) => {
    dispatch({ type: 'ADD_CONTAINER', id, title });
  }, []);

  const updateContainer = useCallback((id, updates) => {
    dispatch({ type: 'UPDATE_CONTAINER', id, updates });
  }, []);

  const deleteContainer = useCallback((id) => {
    if (!state) return;
    const idx = state.containers.findIndex(c => c.id === id);
    const container = state.containers[idx];
    dispatch({ type: 'DELETE_CONTAINER', id });

    toast('Container deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          dispatch({
            type: 'SET_CONTAINERS',
            containers: [
              ...stateRef.current.containers.slice(0, idx),
              container,
              ...stateRef.current.containers.slice(idx),
            ],
          });
        },
      },
    });
  }, [state]);

  const reorderContainers = useCallback((containers) => {
    dispatch({ type: 'REORDER_CONTAINERS', containers });
  }, []);

  const addBookmark = useCallback((containerId, bookmark) => {
    dispatch({ type: 'ADD_BOOKMARK', containerId, bookmark });
  }, []);

  const updateBookmark = useCallback((containerId, bookmarkId, updates) => {
    dispatch({ type: 'UPDATE_BOOKMARK', containerId, bookmarkId, updates });
  }, []);

  const moveBookmark = useCallback((bookmarkId, fromContainerId, toContainerId, toIndex) => {
    dispatch({ type: 'MOVE_BOOKMARK', bookmarkId, fromContainerId, toContainerId, toIndex });
  }, []);

  const deleteBookmark = useCallback((containerId, bookmarkId) => {
    if (!state) return;
    const container = state.containers.find(c => c.id === containerId);
    const idx = container?.bookmarks.findIndex(b => b.id === bookmarkId) ?? -1;
    const bookmark = container?.bookmarks[idx];
    dispatch({ type: 'DELETE_BOOKMARK', containerId, bookmarkId });

    toast('Bookmark deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          // Find the container (might have been recreated)
          const currentState = stateRef.current;
          const targetContainer = currentState.containers.find(c => c.id === containerId)
            ?? currentState.containers[0];
          if (!targetContainer) return;

          const insertIdx = Math.min(idx, targetContainer.bookmarks.length);
          const newBookmarks = [...targetContainer.bookmarks];
          newBookmarks.splice(insertIdx, 0, bookmark);

          dispatch({
            type: 'SET_CONTAINERS',
            containers: currentState.containers.map(c =>
              c.id === targetContainer.id ? { ...c, bookmarks: newBookmarks } : c
            ),
          });
        },
      },
    });
  }, [state]);

  const setContainers = useCallback((containers) => {
    dispatch({ type: 'SET_CONTAINERS', containers });
  }, []);

  return {
    state,
    isLoaded: !!state,
    findDuplicate,
    setTheme,
    addContainer,
    updateContainer,
    deleteContainer,
    reorderContainers,
    addBookmark,
    updateBookmark,
    moveBookmark,
    deleteBookmark,
    setContainers,
    dispatch,
  };
}
