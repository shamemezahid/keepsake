import { STORAGE_KEY, SCHEMA_VERSION, APP_NAME } from "./config";

export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function getDefaultData() {
  return {
    version: SCHEMA_VERSION,
    settings: {
      theme: "system",
      appName: APP_NAME,
      appearance: "relaxed",
      useDividers: false,
    },
    containers: [
      {
        id: generateId(),
        title: "Container",
        collapsed: false,
        bookmarks: [],
      },
    ],
  };
}

export function migrate(data) {
  if (!data || typeof data !== "object") return getDefaultData();
  const current = { ...data };
  if (!current.settings || typeof current.settings !== "object") {
    current.settings = {
      theme: "system",
      appName: APP_NAME,
      appearance: "relaxed",
      useDividers: false,
    };
  } else {
    if (!current.settings.appName) {
      current.settings = { ...current.settings, appName: APP_NAME };
    }
    if (!current.settings.appearance || current.settings.appearance === "extended") {
      current.settings = { ...current.settings, appearance: "relaxed" };
    }
    if (typeof current.settings.useDividers !== "boolean") {
      current.settings = { ...current.settings, useDividers: false };
    }
  }
  return current;
}

export function validateData(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.version !== "number") return false;
  if (!data.settings || typeof data.settings !== "object") return false;
  if (!Array.isArray(data.containers)) return false;

  for (const c of data.containers) {
    if (!c || typeof c !== "object") return false;
    if (typeof c.id !== "string" || typeof c.title !== "string") return false;
    if (typeof c.collapsed !== "boolean") return false;
    if (!Array.isArray(c.bookmarks)) return false;

    for (const b of c.bookmarks) {
      if (!b || typeof b !== "object") return false;
      if (typeof b.id !== "string" || typeof b.url !== "string" || typeof b.title !== "string") {
        return false;
      }
    }
  }

  return true;
}

export function loadFromStorage() {
  if (typeof window === "undefined") {
    return { data: getDefaultData(), isFirstRun: true };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { data: getDefaultData(), isFirstRun: true };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt JSON
      try {
        localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw);
      } catch {}
      return { data: getDefaultData(), isCorrupt: true };
    }

    if (!validateData(parsed)) {
      try {
        localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw);
      } catch {}
      return { data: getDefaultData(), isCorrupt: true };
    }

    const migrated = migrate(parsed);
    return { data: migrated, isFirstRun: false };
  } catch (err) {
    return { data: getDefaultData(), error: err };
  }
}

export function writeToStorage(data) {
  if (typeof window === "undefined") return { success: true };

  try {
    const serialized = JSON.stringify(data);
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing === serialized) {
      return { success: true, skipped: true };
    }

    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}
