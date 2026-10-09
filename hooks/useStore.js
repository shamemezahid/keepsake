"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { toast } from "sonner";
import { STORAGE_KEY, APP_NAME } from "@/lib/config";
import {
  generateId,
  getDefaultData,
  loadFromStorage,
  writeToStorage,
  validateData,
} from "@/lib/storage";

const StoreContext = createContext(null);

function applyDomTheme(theme) {
  if (typeof window === "undefined") return;
  let isDark = false;
  if (theme === "dark") {
    isDark = true;
  } else if (theme === "light") {
    isDark = false;
  } else {
    isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function storeReducer(state, action) {
  switch (action.type) {
    case "INITIALIZE": {
      return {
        ...action.payload,
        isLoaded: true,
      };
    }

    case "REPLACE_STATE": {
      return {
        ...action.payload,
        isLoaded: true,
      };
    }

    case "SET_CONTAINERS": {
      return {
        ...state,
        containers: action.payload,
      };
    }

    case "ADD_CONTAINER": {
      const newContainer = {
        id: generateId(),
        title: action.payload?.title || "Container",
        collapsed: false,
        bookmarks: [],
      };
      return {
        ...state,
        containers: [...state.containers, newContainer],
      };
    }

    case "RENAME_CONTAINER": {
      const { id, title } = action.payload;
      const trimmed = typeof title === "string" ? title.trim() : "";
      return {
        ...state,
        containers: state.containers.map((c) => {
          if (c.id !== id) return c;
          return { ...c, title: trimmed };
        }),
      };
    }

    case "TOGGLE_COLLAPSE": {
      const { id } = action.payload;
      return {
        ...state,
        containers: state.containers.map((c) => {
          if (c.id !== id) return c;
          return { ...c, collapsed: !c.collapsed };
        }),
      };
    }

    case "DELETE_CONTAINER": {
      const { id } = action.payload;
      return {
        ...state,
        containers: state.containers.filter((c) => c.id !== id),
      };
    }

    case "RESTORE_CONTAINER": {
      const { container, index } = action.payload;
      const nextContainers = [...state.containers];
      const targetIndex = Math.min(Math.max(index, 0), nextContainers.length);
      nextContainers.splice(targetIndex, 0, container);
      return {
        ...state,
        containers: nextContainers,
      };
    }

    case "ADD_BOOKMARK": {
      const { containerId, bookmark } = action.payload;
      return {
        ...state,
        containers: state.containers.map((c) => {
          if (c.id !== containerId) return c;
          return {
            ...c,
            bookmarks: [...c.bookmarks, bookmark],
          };
        }),
      };
    }

    case "UPDATE_BOOKMARK": {
      const { oldContainerId, newContainerId, bookmark } = action.payload;
      if (oldContainerId === newContainerId) {
        return {
          ...state,
          containers: state.containers.map((c) => {
            if (c.id !== oldContainerId) return c;
            return {
              ...c,
              bookmarks: c.bookmarks.map((b) => (b.id === bookmark.id ? bookmark : b)),
            };
          }),
        };
      }

      // Moved to a different container
      return {
        ...state,
        containers: state.containers.map((c) => {
          if (c.id === oldContainerId) {
            return {
              ...c,
              bookmarks: c.bookmarks.filter((b) => b.id !== bookmark.id),
            };
          }
          if (c.id === newContainerId) {
            return {
              ...c,
              bookmarks: [...c.bookmarks, bookmark],
            };
          }
          return c;
        }),
      };
    }

    case "DELETE_BOOKMARK": {
      const { containerId, bookmarkId } = action.payload;
      return {
        ...state,
        containers: state.containers.map((c) => {
          if (c.id !== containerId) return c;
          return {
            ...c,
            bookmarks: c.bookmarks.filter((b) => b.id !== bookmarkId),
          };
        }),
      };
    }

    case "RESTORE_BOOKMARK": {
      const { bookmark, containerId, index } = action.payload;
      const targetContainerExists = state.containers.some((c) => c.id === containerId);

      if (targetContainerExists) {
        return {
          ...state,
          containers: state.containers.map((c) => {
            if (c.id !== containerId) return c;
            const nextBookmarks = [...c.bookmarks];
            const targetIdx = Math.min(Math.max(index, 0), nextBookmarks.length);
            nextBookmarks.splice(targetIdx, 0, bookmark);
            return { ...c, bookmarks: nextBookmarks };
          }),
        };
      }

      // Fall back to first container if original container was deleted
      if (state.containers.length > 0) {
        return {
          ...state,
          containers: state.containers.map((c, i) => {
            if (i !== 0) return c;
            return {
              ...c,
              bookmarks: [...c.bookmarks, bookmark],
            };
          }),
        };
      }

      // If zero containers exist, create one to hold restored bookmark
      return {
        ...state,
        containers: [
          {
            id: generateId(),
            title: "Container",
            collapsed: false,
            bookmarks: [bookmark],
          },
        ],
      };
    }

    case "SET_THEME": {
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: action.payload,
        },
      };
    }

    case "SET_APP_NAME": {
      const trimmed = (action.payload || "").trim();
      return {
        ...state,
        settings: {
          ...state.settings,
          appName: trimmed || APP_NAME,
        },
      };
    }

    case "SET_APPEARANCE": {
      const appearance = action.payload;
      const normalized = appearance === "extended" ? "relaxed" : appearance;
      const valid = ["icon-only", "compact", "relaxed"].includes(normalized)
        ? normalized
        : "relaxed";
      return {
        ...state,
        settings: {
          ...state.settings,
          appearance: valid,
        },
      };
    }

    case "SET_USE_DIVIDERS": {
      return {
        ...state,
        settings: {
          ...state.settings,
          useDividers: Boolean(action.payload),
        },
      };
    }

    case "TOGGLE_USE_DIVIDERS": {
      return {
        ...state,
        settings: {
          ...state.settings,
          useDividers: !state.settings?.useDividers,
        },
      };
    }

    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, {
    ...getDefaultData(),
    isLoaded: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveTimerRef = useRef(null);
  const skipNextSaveRef = useRef(false);

  // Synchronous flush helper
  const flushStorage = useCallback(() => {
    if (!stateRef.current.isLoaded) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const cleanData = {
      version: stateRef.current.version,
      settings: stateRef.current.settings,
      containers: stateRef.current.containers,
    };
    const res = writeToStorage(cleanData);
    if (res && res.error) {
      toast.error("Failed to save changes to localStorage");
    }
  }, []);

  // Initial load after mount
  useEffect(() => {
    const { data, isCorrupt, error } = loadFromStorage();

    if (isCorrupt) {
      toast.error("Stored bookmarks data was corrupt. A backup was saved.");
    } else if (error) {
      toast.error("Failed to read bookmarks from localStorage");
    }

    skipNextSaveRef.current = true;
    dispatch({ type: "INITIALIZE", payload: data });
    applyDomTheme(data.settings?.theme || "system");
  }, []);

  // Debounced persistence on state change
  useEffect(() => {
    if (!state.isLoaded) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      flushStorage();
    }, 150);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, flushStorage]);

  // Flush on visibilitychange and pagehide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushStorage();
      }
    };

    const handlePageHide = () => {
      flushStorage();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushStorage]);

  // Cross-tab sync
  useEffect(() => {
    const handleStorageEvent = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (validateData(parsed)) {
            skipNextSaveRef.current = true;
            dispatch({ type: "REPLACE_STATE", payload: parsed });
            applyDomTheme(parsed.settings?.theme || "system");
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  // Handle system theme listener
  const currentTheme = state.settings?.theme || "system";
  useEffect(() => {
    applyDomTheme(currentTheme);

    if (currentTheme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyDomTheme("system");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [currentTheme]);

  // Public action dispatchers
  const addContainer = useCallback((title = "Container") => {
    const newContainer = {
      id: generateId(),
      title,
      collapsed: false,
      bookmarks: [],
    };
    dispatch({ type: "SET_CONTAINERS", payload: [...stateRef.current.containers, newContainer] });
    return newContainer;
  }, []);

  const renameContainer = useCallback((id, title) => {
    dispatch({ type: "RENAME_CONTAINER", payload: { id, title } });
  }, []);

  const toggleContainerCollapse = useCallback((id) => {
    dispatch({ type: "TOGGLE_COLLAPSE", payload: { id } });
  }, []);

  const deleteContainer = useCallback((containerId) => {
    const currentList = stateRef.current.containers;
    const index = currentList.findIndex((c) => c.id === containerId);
    const container = currentList[index];
    if (!container) return;

    dispatch({ type: "DELETE_CONTAINER", payload: { id: containerId } });

    toast("Container deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          dispatch({
            type: "RESTORE_CONTAINER",
            payload: { container, index },
          });
        },
      },
    });
  }, []);

  const setContainers = useCallback((containers) => {
    dispatch({ type: "SET_CONTAINERS", payload: containers });
  }, []);

  const addBookmark = useCallback((containerId, bookmarkData) => {
    const newBookmark = {
      id: generateId(),
      url: bookmarkData.url,
      title: bookmarkData.title,
      description: bookmarkData.description || "",
      createdAt: new Date().toISOString(),
    };
    dispatch({
      type: "ADD_BOOKMARK",
      payload: { containerId, bookmark: newBookmark },
    });
    return newBookmark;
  }, []);

  const updateBookmark = useCallback((oldContainerId, newContainerId, bookmark) => {
    dispatch({
      type: "UPDATE_BOOKMARK",
      payload: { oldContainerId, newContainerId, bookmark },
    });
  }, []);

  const deleteBookmark = useCallback((containerId, bookmarkId) => {
    const container = stateRef.current.containers.find((c) => c.id === containerId);
    if (!container) return;
    const index = container.bookmarks.findIndex((b) => b.id === bookmarkId);
    const bookmark = container.bookmarks[index];
    if (!bookmark) return;

    dispatch({
      type: "DELETE_BOOKMARK",
      payload: { containerId, bookmarkId },
    });

    toast("Bookmark deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          dispatch({
            type: "RESTORE_BOOKMARK",
            payload: { bookmark, containerId, index },
          });
        },
      },
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const isDarkNow = document.documentElement.classList.contains("dark");
    const nextTheme = isDarkNow ? "light" : "dark";
    dispatch({ type: "SET_THEME", payload: nextTheme });
    applyDomTheme(nextTheme);
  }, []);

  const setTheme = useCallback((theme) => {
    dispatch({ type: "SET_THEME", payload: theme });
    applyDomTheme(theme);
  }, []);

  const setAppName = useCallback((appName) => {
    dispatch({ type: "SET_APP_NAME", payload: appName });
  }, []);

  const setAppearance = useCallback((appearance) => {
    dispatch({ type: "SET_APPEARANCE", payload: appearance });
  }, []);

  const setUseDividers = useCallback((useDividers) => {
    dispatch({ type: "SET_USE_DIVIDERS", payload: useDividers });
  }, []);

  const toggleUseDividers = useCallback(() => {
    dispatch({ type: "TOGGLE_USE_DIVIDERS" });
  }, []);

  const value = {
    isLoaded: state.isLoaded,
    version: state.version,
    settings: state.settings,
    appName: state.settings?.appName || APP_NAME,
    appearance:
      state.settings?.appearance === "extended"
        ? "relaxed"
        : state.settings?.appearance || "relaxed",
    useDividers: Boolean(state.settings?.useDividers),
    containers: state.containers,
    addContainer,
    renameContainer,
    toggleContainerCollapse,
    deleteContainer,
    setContainers,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    toggleTheme,
    setTheme,
    setAppName,
    setAppearance,
    setUseDividers,
    toggleUseDividers,
    rawState: state,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
