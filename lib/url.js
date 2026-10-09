/**
 * URL normalization, validation, duplicate comparison, and display helpers.
 */

export function normalizeUrl(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    return { valid: false, error: "URL is required" };
  }
  let trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: "URL is required" };
  }

  // If it has no scheme (regex /^[a-z][a-z0-9+.-]*:\/\//i fails), prepend "https://"
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(trimmed);
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
    }
    return { valid: true, url: urlObj.href, urlObj };
  } catch {
    return { valid: false, error: "Please enter a valid URL" };
  }
}

/**
 * Returns a normalized key for duplicate detection:
 * lowercase host, no trailing slash on path, search kept, hash dropped.
 */
export function getComparisonKey(url) {
  try {
    const norm = normalizeUrl(url);
    if (!norm.valid) return String(url).trim().toLowerCase();
    const u = norm.urlObj;
    const host = u.hostname.toLowerCase();
    const port = u.port ? `:${u.port}` : "";
    let pathname = u.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.replace(/\/+$/, "");
    } else if (pathname === "/") {
      pathname = "";
    }
    const search = u.search || "";
    return `${u.protocol}//${host}${port}${pathname}${search}`;
  } catch {
    return String(url).trim().toLowerCase();
  }
}

export function getHostname(url) {
  try {
    const norm = normalizeUrl(url);
    if (norm.valid) {
      return norm.urlObj.hostname;
    }
  } catch {}
  return "";
}

export function getDisplayHostname(url) {
  const host = getHostname(url);
  return host.replace(/^www\./i, "");
}

export function findDuplicate(containers, url, excludeBookmarkId = null) {
  const targetKey = getComparisonKey(url);
  if (!targetKey) return null;

  for (const container of containers) {
    if (!Array.isArray(container.bookmarks)) continue;
    for (const b of container.bookmarks) {
      if (excludeBookmarkId && b.id === excludeBookmarkId) {
        continue;
      }
      if (getComparisonKey(b.url) === targetKey) {
        return {
          containerTitle: container.title,
          bookmark: b,
        };
      }
    }
  }
  return null;
}
