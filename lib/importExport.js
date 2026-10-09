import { APP_NAME, SCHEMA_VERSION } from "./config";
import { generateId, migrate } from "./storage";
import { normalizeUrl, getComparisonKey, getDisplayHostname } from "./url";

export function exportBookmarks(data) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const filename = `${APP_NAME}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function processImportFile(fileText, currentContainers) {
  let parsed;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return {
      success: false,
      error: "The file could not be parsed as valid JSON.",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      success: false,
      error: "The file must contain a JSON object at its root.",
    };
  }

  if (typeof parsed.version !== "number") {
    return {
      success: false,
      error: "The file is missing a numeric version field.",
    };
  }

  if (parsed.version > SCHEMA_VERSION) {
    return {
      success: false,
      error: `File version (${parsed.version}) is newer than supported version (${SCHEMA_VERSION}).`,
    };
  }

  const migrated = migrate(parsed);

  if (!Array.isArray(migrated.containers)) {
    return {
      success: false,
      error: "The file must contain a 'containers' array.",
    };
  }

  for (const c of migrated.containers) {
    if (!c || typeof c !== "object" || typeof c.title !== "string" || !Array.isArray(c.bookmarks)) {
      return {
        success: false,
        error: "Each container in the file must have a string title and a bookmarks array.",
      };
    }
  }

  // Pre-seed duplicate lookup from existing bookmarks
  const seenComparisonKeys = new Set();
  for (const c of currentContainers) {
    if (!Array.isArray(c.bookmarks)) continue;
    for (const b of c.bookmarks) {
      const key = getComparisonKey(b.url);
      if (key) seenComparisonKeys.add(key);
    }
  }

  let bookmarksAdded = 0;
  let duplicatesSkipped = 0;
  let invalidSkipped = 0;
  let containersCreated = 0;
  const mergedContainerIds = new Set();
  const skippedItems = [];

  const nextContainers = currentContainers.map((c) => ({
    ...c,
    bookmarks: [...(c.bookmarks || [])],
  }));

  for (const importContainer of migrated.containers) {
    const trimmedTitle = (importContainer.title || "").trim();
    const titleLower = trimmedTitle.toLowerCase();

    let targetContainer = nextContainers.find(
      (c) => (c.title || "").trim().toLowerCase() === titleLower
    );

    let isNewContainer = false;
    if (!targetContainer) {
      targetContainer = {
        id: generateId(),
        title: trimmedTitle || "Container",
        collapsed: Boolean(importContainer.collapsed),
        bookmarks: [],
      };
      nextContainers.push(targetContainer);
      isNewContainer = true;
      containersCreated++;
    }

    let addedToThisContainer = 0;

    for (const b of importContainer.bookmarks) {
      if (
        !b ||
        typeof b !== "object" ||
        typeof b.url !== "string" ||
        typeof b.title !== "string" ||
        !b.title.trim()
      ) {
        invalidSkipped++;
        skippedItems.push({
          title: b && typeof b.title === "string" && b.title.trim() ? b.title.trim() : "Untitled",
          url: b && typeof b.url === "string" ? b.url : "Missing URL",
          reason: "Missing or empty title/url",
        });
        continue;
      }

      const norm = normalizeUrl(b.url);
      if (!norm.valid) {
        invalidSkipped++;
        skippedItems.push({
          title: b.title.trim(),
          url: b.url,
          reason: norm.error || "Invalid URL",
        });
        continue;
      }

      const compKey = getComparisonKey(norm.url);
      if (seenComparisonKeys.has(compKey)) {
        duplicatesSkipped++;
        skippedItems.push({
          title: b.title.trim(),
          url: norm.url,
          reason: "Duplicate bookmark",
        });
        continue;
      }

      seenComparisonKeys.add(compKey);
      bookmarksAdded++;
      addedToThisContainer++;

      targetContainer.bookmarks.push({
        id: generateId(),
        url: norm.url,
        title: b.title.trim(),
        description: typeof b.description === "string" ? b.description.trim() : "",
        createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
      });
    }

    if (!isNewContainer && addedToThisContainer > 0) {
      mergedContainerIds.add(targetContainer.id);
    }
  }

  return {
    success: true,
    nextContainers,
    report: {
      bookmarksAdded,
      duplicatesSkipped,
      invalidSkipped,
      containersCreated,
      containersMergedInto: mergedContainerIds.size,
      skippedItems,
    },
  };
}

/**
 * Standard RFC 4180 compliant CSV parser
 * Correctly handles commas inside quotes, multiline fields, and escaped quotes ("")
 */
export function parseCSV(text) {
  if (typeof text !== "string") return [];

  // Remove UTF-8 BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && cleanText[i + 1] === '"') {
          // Escaped quote: ""
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < len && cleanText[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Final field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Export bookmarks to a well-formatted CSV file with UTF-8 BOM
 */
export function exportBookmarksCSV(containers, appName = APP_NAME) {
  const headers = ["Container", "Title", "URL", "Description"];
  const rows = [];

  for (const c of containers || []) {
    const containerTitle = c.title || "";
    for (const b of c.bookmarks || []) {
      rows.push([
        containerTitle,
        b.title || "",
        b.url || "",
        b.description || "",
      ]);
    }
  }

  function escapeCSVField(val) {
    const str = String(val ?? "");
    if (
      str.includes('"') ||
      str.includes(",") ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvContent = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((row) => row.map(escapeCSVField).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const filename = `${appName || APP_NAME}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and merge CSV bookmarks into containers
 * Gracefully rejects invalid files and logs errors without crashing
 */
export function processImportCSV(fileText, currentContainers) {
  if (typeof fileText !== "string" || !fileText.trim()) {
    return {
      success: false,
      error: "The CSV file is empty or contains no data.",
    };
  }

  let rows;
  try {
    rows = parseCSV(fileText);
  } catch {
    return {
      success: false,
      error: "The file could not be parsed as valid CSV.",
    };
  }

  const validRows = rows.filter((r) =>
    r.some((cell) => cell.trim().length > 0)
  );

  if (validRows.length === 0) {
    return {
      success: false,
      error: "The CSV file contains no valid rows.",
    };
  }

  // Detect headers
  const headerRow = validRows[0].map((c) => c.trim().toLowerCase());
  let containerIdx = headerRow.findIndex((h) =>
    ["container", "folder", "category", "group", "collection", "tag"].includes(h)
  );
  let titleIdx = headerRow.findIndex((h) =>
    ["title", "name", "bookmark", "label"].includes(h)
  );
  let urlIdx = headerRow.findIndex((h) =>
    ["url", "link", "uri", "href", "address", "website"].includes(h)
  );
  let descIdx = headerRow.findIndex((h) =>
    ["description", "desc", "notes", "note", "details", "comment", "summary"].includes(h)
  );

  let startRowIndex = 1;

  if (urlIdx === -1) {
    // If no header matches "url", check if row 0 itself or early rows contain URLs
    const sampleRows = validRows.slice(0, 5);
    let detectedUrlCol = -1;
    for (let col = 0; col < (validRows[0]?.length || 0); col++) {
      const hasUrl = sampleRows.some((r) => {
        const cell = (r[col] || "").trim();
        return (
          cell.startsWith("http://") ||
          cell.startsWith("https://") ||
          cell.includes("://") ||
          cell.startsWith("www.")
        );
      });
      if (hasUrl) {
        detectedUrlCol = col;
        break;
      }
    }

    if (detectedUrlCol !== -1) {
      urlIdx = detectedUrlCol;
      const row0Cell = (validRows[0][urlIdx] || "").trim();
      if (
        row0Cell.startsWith("http://") ||
        row0Cell.startsWith("https://") ||
        row0Cell.includes("://") ||
        row0Cell.startsWith("www.")
      ) {
        startRowIndex = 0;
      } else {
        startRowIndex = 1;
      }
    } else {
      return {
        success: false,
        error: "Could not find a 'URL' or 'Link' column in the CSV file.",
      };
    }
  }

  const dataRows = validRows.slice(startRowIndex);
  if (dataRows.length === 0) {
    return {
      success: false,
      error: "The CSV file contains a header but no bookmark rows.",
    };
  }

  // Pre-seed duplicate lookup from existing bookmarks
  const seenComparisonKeys = new Set();
  for (const c of currentContainers) {
    if (!Array.isArray(c.bookmarks)) continue;
    for (const b of c.bookmarks) {
      const key = getComparisonKey(b.url);
      if (key) seenComparisonKeys.add(key);
    }
  }

  let bookmarksAdded = 0;
  let duplicatesSkipped = 0;
  let invalidSkipped = 0;
  let containersCreated = 0;
  const mergedContainerIds = new Set();
  const skippedItems = [];

  const nextContainers = currentContainers.map((c) => ({
    ...c,
    bookmarks: [...(c.bookmarks || [])],
  }));

  for (const row of dataRows) {
    const rawUrl = (
      urlIdx !== -1 && row[urlIdx] !== undefined ? row[urlIdx] : ""
    ).trim();
    let rawTitle = (
      titleIdx !== -1 && row[titleIdx] !== undefined ? row[titleIdx] : ""
    ).trim();
    const rawContainer = (
      containerIdx !== -1 && row[containerIdx] !== undefined
        ? row[containerIdx]
        : ""
    ).trim();
    const rawDesc = (
      descIdx !== -1 && row[descIdx] !== undefined ? row[descIdx] : ""
    ).trim();

    if (!rawUrl) {
      invalidSkipped++;
      skippedItems.push({
        title: rawTitle || "Untitled",
        url: "Missing URL",
        reason: "Missing or empty URL",
      });
      continue;
    }

    const norm = normalizeUrl(rawUrl);
    if (!norm.valid) {
      invalidSkipped++;
      skippedItems.push({
        title: rawTitle || "Untitled",
        url: rawUrl,
        reason: norm.error || "Invalid URL",
      });
      continue;
    }

    if (!rawTitle) {
      rawTitle = getDisplayHostname(norm.url) || norm.url;
    }

    const compKey = getComparisonKey(norm.url);
    if (seenComparisonKeys.has(compKey)) {
      duplicatesSkipped++;
      skippedItems.push({
        title: rawTitle,
        url: norm.url,
        reason: "Duplicate bookmark",
      });
      continue;
    }

    // Determine target container
    const targetTitle =
      rawContainer || (nextContainers[0]?.title ?? "Container");
    const targetTitleLower = targetTitle.toLowerCase();

    let targetContainer = nextContainers.find(
      (c) => (c.title || "").trim().toLowerCase() === targetTitleLower
    );

    let isNewContainer = false;
    if (!targetContainer) {
      targetContainer = {
        id: generateId(),
        title: targetTitle,
        collapsed: false,
        bookmarks: [],
      };
      nextContainers.push(targetContainer);
      isNewContainer = true;
      containersCreated++;
    }

    seenComparisonKeys.add(compKey);
    bookmarksAdded++;

    targetContainer.bookmarks.push({
      id: generateId(),
      url: norm.url,
      title: rawTitle,
      description: rawDesc,
      createdAt: new Date().toISOString(),
    });

    if (!isNewContainer) {
      mergedContainerIds.add(targetContainer.id);
    }
  }

  return {
    success: true,
    nextContainers,
    report: {
      bookmarksAdded,
      duplicatesSkipped,
      invalidSkipped,
      containersCreated,
      containersMergedInto: mergedContainerIds.size,
      skippedItems,
    },
  };
}
