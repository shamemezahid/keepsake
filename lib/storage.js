import { STORAGE_KEY, SCHEMA_VERSION } from './config';

function generateId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function createDefaultData() {
  return {
    version: SCHEMA_VERSION,
    settings: { theme: 'system' },
    containers: [
      {
        id: generateId(),
        title: 'Container',
        collapsed: false,
        bookmarks: [],
      },
    ],
  };
}

/**
 * Migrate data to the current schema version.
 * Currently a no-op for version 1.
 */
export function migrate(data) {
  // Future migrations go here
  return { ...data, version: SCHEMA_VERSION };
}

/**
 * Validate the loaded data structure loosely.
 * Returns true if the structure is acceptable.
 */
export function isValidData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.containers)) return false;
  return true;
}

let saveTimeout = null;
let lastSavedString = null;

export function scheduleSave(data) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => flushSave(data), 150);
}

export function flushSave(data) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    const serialized = JSON.stringify(data);
    const current = localStorage.getItem(STORAGE_KEY);
    if (serialized !== current) {
      localStorage.setItem(STORAGE_KEY, serialized);
      lastSavedString = serialized;
    }
  } catch (e) {
    console.error('Failed to save to localStorage', e);
    return false;
  }
  return true;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: createDefaultData(), error: null };

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw);
      return { data: createDefaultData(), error: 'Stored data was corrupted. Starting fresh (backup saved).' };
    }

    if (!isValidData(parsed)) {
      localStorage.setItem(`${STORAGE_KEY}:corrupt-backup`, raw);
      return { data: createDefaultData(), error: 'Stored data failed validation. Starting fresh (backup saved).' };
    }

    if (typeof parsed.version === 'number' && parsed.version > SCHEMA_VERSION) {
      return { data: createDefaultData(), error: `Data was saved with a newer version (v${parsed.version}). Starting fresh.` };
    }

    const migrated = migrate(parsed);
    return { data: migrated, error: null };
  } catch (e) {
    return { data: createDefaultData(), error: 'Could not access localStorage. Changes will not be saved.' };
  }
}

export { generateId };
