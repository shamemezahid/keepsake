/**
 * URL utilities for Keepsake
 */

/**
 * Normalize a URL: trim, prepend https if missing, validate.
 * Returns { url, error }
 */
export function normalizeUrl(raw) {
  const trimmed = raw.trim();
  let urlStr = trimmed;

  // Prepend https:// if no scheme
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(urlStr)) {
    urlStr = 'https://' + urlStr;
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: null, error: 'Only http and https URLs are allowed.' };
    }
    return { url: urlStr, error: null };
  } catch {
    return { url: null, error: 'Please enter a valid URL.' };
  }
}

/**
 * Get hostname without www. from a URL string.
 */
export function getHostname(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

/**
 * Get favicon URL from DuckDuckGo for a given URL.
 */
export function getFaviconUrl(urlStr) {
  const hostname = getHostname(urlStr);
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

/**
 * Normalize a URL for duplicate detection:
 * lowercase host, no trailing slash on path, search kept, hash dropped.
 */
export function normalizeForDupe(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.host.toLowerCase();
    let path = u.pathname;
    // Remove trailing slash unless it's the root
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    const search = u.search;
    return `${u.protocol}//${host}${path}${search}`;
  } catch {
    return urlStr.toLowerCase();
  }
}
