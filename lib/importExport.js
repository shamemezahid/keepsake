import { APP_NAME, SCHEMA_VERSION } from './config';
import { normalizeForDupe, normalizeUrl } from './url';
import { generateId } from './storage';

/**
 * Export current data as a JSON file download.
 */
export function exportData(data) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `${APP_NAME}_${dateStr}_${timeStr}.json`;

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate an import file's parsed JSON.
 * Returns { valid: bool, error: string|null, data: parsed|null }
 */
function validateImportFile(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'File is not a valid JSON object.' };
  }
  if (typeof parsed.version !== 'number') {
    return { valid: false, error: 'Missing or invalid version field.' };
  }
  if (parsed.version > SCHEMA_VERSION) {
    return { valid: false, error: `Cannot import: file was created with a newer schema version (v${parsed.version}). Current version is v${SCHEMA_VERSION}.` };
  }
  if (!Array.isArray(parsed.containers)) {
    return { valid: false, error: 'Missing or invalid containers array.' };
  }
  return { valid: true, error: null, data: parsed };
}

/**
 * Process an import: merge into existing data.
 * Returns { newData, report }
 */
export function processImport(existingData, importedRaw) {
  let parsed;
  try {
    parsed = JSON.parse(importedRaw);
  } catch {
    return {
      newData: existingData,
      report: {
        success: false,
        error: 'File is not valid JSON.',
        added: 0,
        duplicates: 0,
        invalid: 0,
        containersCreated: 0,
        containersMerged: 0,
        skippedItems: [],
      },
    };
  }

  const validation = validateImportFile(parsed);
  if (!validation.valid) {
    return {
      newData: existingData,
      report: {
        success: false,
        error: validation.error,
        added: 0,
        duplicates: 0,
        invalid: 0,
        containersCreated: 0,
        containersMerged: 0,
        skippedItems: [],
      },
    };
  }

  // Build existing URL set for duplicate detection
  const existingUrls = new Set();
  for (const c of existingData.containers) {
    for (const b of c.bookmarks) {
      existingUrls.add(normalizeForDupe(b.url));
    }
  }

  const newContainers = [...existingData.containers.map(c => ({
    ...c,
    bookmarks: [...c.bookmarks],
  }))];

  // URLs seen in this import session (for intra-import dupe detection)
  const importedUrls = new Set(existingUrls);

  let added = 0;
  let duplicates = 0;
  let invalid = 0;
  let containersCreated = 0;
  let containersMerged = 0;
  const skippedItems = [];

  for (const importContainer of parsed.containers) {
    if (!importContainer || typeof importContainer !== 'object') continue;
    if (typeof importContainer.title !== 'string') continue;
    if (!Array.isArray(importContainer.bookmarks)) continue;

    const normalizedTitle = importContainer.title.trim().toLowerCase();

    // Find matching container (case-insensitive, trimmed)
    let targetContainerIdx = newContainers.findIndex(
      c => c.title.trim().toLowerCase() === normalizedTitle
    );

    let isNew = false;
    if (targetContainerIdx === -1) {
      // Create new container
      newContainers.push({
        id: generateId(),
        title: importContainer.title.trim() || 'Imported',
        collapsed: importContainer.collapsed ?? false,
        bookmarks: [],
      });
      targetContainerIdx = newContainers.length - 1;
      containersCreated++;
      isNew = true;
    } else {
      containersMerged++;
    }

    for (const bookmark of importContainer.bookmarks) {
      if (!bookmark || typeof bookmark !== 'object') {
        invalid++;
        skippedItems.push({ title: '(unknown)', url: '', reason: 'Invalid bookmark structure' });
        continue;
      }

      const rawUrl = bookmark.url;
      const title = bookmark.title;

      if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
        invalid++;
        skippedItems.push({ title: title || '(no title)', url: rawUrl || '', reason: 'Missing or empty URL' });
        continue;
      }
      if (typeof title !== 'string' || !title.trim()) {
        invalid++;
        skippedItems.push({ title: '(no title)', url: rawUrl, reason: 'Missing or empty title' });
        continue;
      }

      const { url: normalizedUrl, error: urlError } = normalizeUrl(rawUrl);
      if (!normalizedUrl) {
        invalid++;
        skippedItems.push({ title, url: rawUrl, reason: urlError || 'Invalid URL' });
        continue;
      }

      const dupeKey = normalizeForDupe(normalizedUrl);
      if (importedUrls.has(dupeKey)) {
        duplicates++;
        skippedItems.push({ title, url: normalizedUrl, reason: 'Duplicate URL' });
        continue;
      }

      importedUrls.add(dupeKey);
      newContainers[targetContainerIdx].bookmarks.push({
        id: generateId(),
        url: normalizedUrl,
        title: title.trim(),
        description: typeof bookmark.description === 'string' ? bookmark.description : '',
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    // If new container has no bookmarks, remove it (nothing to add)
    if (isNew && newContainers[targetContainerIdx].bookmarks.length === 0) {
      newContainers.splice(targetContainerIdx, 1);
      containersCreated--;
    }
  }

  return {
    newData: { ...existingData, containers: newContainers },
    report: {
      success: true,
      error: null,
      added,
      duplicates,
      invalid,
      containersCreated,
      containersMerged,
      skippedItems,
    },
  };
}
