import { describe, it, expect } from "bun:test";
import { normalizeUrl, getComparisonKey, getHostname, getDisplayHostname, findDuplicate } from "../lib/url";
import { getDefaultData, validateData, migrate } from "../lib/storage";
import { processImportFile, parseCSV, processImportCSV } from "../lib/importExport";
import { SCHEMA_VERSION, APP_NAME } from "../lib/config";
import { storeReducer } from "../hooks/useStore";

describe("lib/url.js", () => {
  it("normalizes URLs without scheme by prepending https://", () => {
    const res = normalizeUrl("github.com");
    expect(res.valid).toBe(true);
    expect(res.url).toBe("https://github.com/");
  });

  it("normalizes URLs with scheme", () => {
    const res = normalizeUrl("http://example.com/page");
    expect(res.valid).toBe(true);
    expect(res.url).toBe("http://example.com/page");
  });

  it("trims whitespace", () => {
    const res = normalizeUrl("   https://example.com/foo   ");
    expect(res.valid).toBe(true);
    expect(res.url).toBe("https://example.com/foo");
  });

  it("rejects invalid protocols like ftp or javascript", () => {
    expect(normalizeUrl("ftp://example.com").valid).toBe(false);
    expect(normalizeUrl("javascript:alert(1)").valid).toBe(false);
    expect(normalizeUrl("").valid).toBe(false);
  });

  it("computes duplicate comparison key correctly (lowercase host, no trailing slash, search kept, hash dropped)", () => {
    const key1 = getComparisonKey("https://EXAMPLE.COM/path/");
    const key2 = getComparisonKey("https://example.com/path");
    const key3 = getComparisonKey("https://example.com/path#heading");
    const key4 = getComparisonKey("https://example.com/path?query=1");

    expect(key1).toBe("https://example.com/path");
    expect(key2).toBe("https://example.com/path");
    expect(key3).toBe("https://example.com/path");
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);

    // Search is kept
    expect(key4).toBe("https://example.com/path?query=1");
    expect(key4).not.toBe(key1);

    // Root path with or without trailing slash
    expect(getComparisonKey("https://example.com/")).toBe("https://example.com");
    expect(getComparisonKey("https://example.com")).toBe("https://example.com");
  });

  it("extracts hostname and display hostname (without www.)", () => {
    expect(getHostname("https://www.google.com/search")).toBe("www.google.com");
    expect(getDisplayHostname("https://www.google.com/search")).toBe("google.com");
    expect(getDisplayHostname("https://news.ycombinator.com")).toBe("news.ycombinator.com");
  });

  it("finds duplicate bookmarks across containers", () => {
    const containers = [
      {
        id: "c1",
        title: "Dev",
        bookmarks: [
          { id: "b1", url: "https://github.com/facebook/react" },
        ],
      },
      {
        id: "c2",
        title: "News",
        bookmarks: [
          { id: "b2", url: "https://news.ycombinator.com" },
        ],
      },
    ];

    const dup = findDuplicate(containers, "https://GITHUB.COM/facebook/react/");
    expect(dup).not.toBeNull();
    expect(dup?.containerTitle).toBe("Dev");

    const dupExcluded = findDuplicate(containers, "https://github.com/facebook/react", "b1");
    expect(dupExcluded).toBeNull();
  });
});

describe("lib/storage.js", () => {
  it("provides valid default data", () => {
    const data = getDefaultData();
    expect(data.version).toBe(SCHEMA_VERSION);
    expect(data.settings.theme).toBe("system");
    expect(data.settings.appName).toBe(APP_NAME);
    expect(data.settings.appearance).toBe("relaxed");
    expect(data.settings.useDividers).toBe(false);
    expect(data.containers.length).toBe(1);
    expect(data.containers[0].title).toBe("Container");
    expect(data.containers[0].collapsed).toBe(false);
    expect(data.containers[0].bookmarks).toEqual([]);
    expect(validateData(data)).toBe(true);
  });

  it("validates data correctly", () => {
    expect(validateData(null)).toBe(false);
    expect(validateData({})).toBe(false);
    expect(validateData({ version: "1" })).toBe(false);
    expect(validateData({ version: 1, settings: {}, containers: [] })).toBe(true);
  });

  it("migrates data without appName or appearance by adding defaults", () => {
    const oldData = {
      version: 1,
      settings: { theme: "dark" },
      containers: [],
    };
    const migrated = migrate(oldData);
    expect(migrated.settings.appName).toBe(APP_NAME);
    expect(migrated.settings.theme).toBe("dark");
    expect(migrated.settings.appearance).toBe("relaxed");
    expect(migrated.settings.useDividers).toBe(false);
  });

  it("preserves custom appearance and useDividers during migration", () => {
    const oldData = {
      version: 1,
      settings: { theme: "light", appName: "My Keepsake", appearance: "compact", useDividers: true },
      containers: [],
    };
    const migrated = migrate(oldData);
    expect(migrated.settings.appearance).toBe("compact");
    expect(migrated.settings.useDividers).toBe(true);
  });

  it("migrates legacy 'extended' appearance to 'relaxed'", () => {
    const oldData = {
      version: 1,
      settings: { appearance: "extended" },
      containers: [],
    };
    const migrated = migrate(oldData);
    expect(migrated.settings.appearance).toBe("relaxed");
  });
});

describe("lib/importExport.js", () => {
  it("rejects invalid JSON", () => {
    const res = processImportFile("not a json", []);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects future schema version", () => {
    const res = processImportFile(JSON.stringify({ version: 999, containers: [] }), []);
    expect(res.success).toBe(false);
    expect(res.error).toContain("newer than supported version");
  });

  it("merges into existing container by title (case-insensitive, trimmed) and adds new container", () => {
    const current = [
      {
        id: "c1",
        title: "General",
        collapsed: false,
        bookmarks: [
          { id: "b1", url: "https://example.com", title: "Example" },
        ],
      },
    ];

    const importPayload = {
      version: 1,
      settings: { theme: "dark" },
      containers: [
        {
          title: " general ",
          bookmarks: [
            { url: "https://example.com/", title: "Duplicate Example" }, // duplicate -> skip
            { url: "https://developer.mozilla.org", title: "MDN", description: "Docs" }, // valid -> add
            { url: "ftp://invalid", title: "Invalid" }, // invalid -> skip
          ],
        },
        {
          title: "Reading",
          collapsed: true,
          bookmarks: [
            { url: "https://lobste.rs", title: "Lobsters" },
          ],
        },
      ],
    };

    const res = processImportFile(JSON.stringify(importPayload), current);
    expect(res.success).toBe(true);
    expect(res.report.bookmarksAdded).toBe(2);
    expect(res.report.duplicatesSkipped).toBe(1);
    expect(res.report.invalidSkipped).toBe(1);
    expect(res.report.containersMergedInto).toBe(1);
    expect(res.report.containersCreated).toBe(1);

    // Verify containers in output
    expect(res.nextContainers.length).toBe(2);
    expect(res.nextContainers[0].title).toBe("General");
    expect(res.nextContainers[0].bookmarks.length).toBe(2); // original + MDN
    expect(res.nextContainers[1].title).toBe("Reading");
    expect(res.nextContainers[1].collapsed).toBe(true);
    expect(res.nextContainers[1].bookmarks.length).toBe(1);
  });
});

describe("Multi-container bookmark and container moves", () => {
  it("correctly moves a bookmark from one container to another container without data loss", () => {
    const containers = [
      {
        id: "c1",
        title: "Work",
        collapsed: false,
        bookmarks: [
          { id: "b1", title: "GitHub", url: "https://github.com" },
          { id: "b2", title: "Slack", url: "https://slack.com" },
        ],
      },
      {
        id: "c2",
        title: "Personal",
        collapsed: false,
        bookmarks: [
          { id: "b3", title: "YouTube", url: "https://youtube.com" },
        ],
      },
    ];

    // Simulate cross-container move of b1 from c1 to c2
    const sourceContIndex = containers.findIndex((c) => c.id === "c1");
    const destContIndex = containers.findIndex((c) => c.id === "c2");

    const sourceBookmarks = [...containers[sourceContIndex].bookmarks];
    const destBookmarks = [...containers[destContIndex].bookmarks];

    const sourceIndex = sourceBookmarks.findIndex((b) => b.id === "b1");
    const [moved] = sourceBookmarks.splice(sourceIndex, 1);
    destBookmarks.push(moved);

    const nextContainers = [...containers];
    nextContainers[sourceContIndex] = { ...containers[sourceContIndex], bookmarks: sourceBookmarks };
    nextContainers[destContIndex] = { ...containers[destContIndex], bookmarks: destBookmarks };

    expect(nextContainers[0].bookmarks.length).toBe(1);
    expect(nextContainers[0].bookmarks[0].id).toBe("b2");
    expect(nextContainers[1].bookmarks.length).toBe(2);
    expect(nextContainers[1].bookmarks[1].id).toBe("b1");
  });

  it("handles moving the only bookmark out of a container making it empty", () => {
    const containers = [
      {
        id: "c1",
        title: "Work",
        collapsed: false,
        bookmarks: [
          { id: "b1", title: "GitHub", url: "https://github.com" },
        ],
      },
      {
        id: "c2",
        title: "Empty Container",
        collapsed: false,
        bookmarks: [],
      },
    ];

    const sourceBookmarks = [...containers[0].bookmarks];
    const destBookmarks = [...containers[1].bookmarks];

    const [moved] = sourceBookmarks.splice(0, 1);
    destBookmarks.push(moved);

    const nextContainers = [
      { ...containers[0], bookmarks: sourceBookmarks },
      { ...containers[1], bookmarks: destBookmarks },
    ];

    expect(nextContainers[0].bookmarks.length).toBe(0);
    expect(nextContainers[1].bookmarks.length).toBe(1);
    expect(nextContainers[1].bookmarks[0].id).toBe("b1");
  });

  it("validates containers with empty titles as valid data", () => {
    const data = {
      version: 1,
      settings: { theme: "system", appName: "Keepsake" },
      containers: [
        {
          id: "c1",
          title: "",
          collapsed: false,
          bookmarks: [],
        },
      ],
    };

    expect(validateData(data)).toBe(true);
  });
});

describe("CSV Parsing and Import/Export", () => {
  it("parses CSV correctly including quotes, commas, and newlines", () => {
    const csv = 'Container,Title,URL,Description\r\n"Work","GitHub, Inc.","https://github.com","Code & PRs"\r\n"Personal","Video ""Fun""","https://youtube.com","Line 1\nLine 2"';
    const rows = parseCSV(csv);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(["Container", "Title", "URL", "Description"]);
    expect(rows[1]).toEqual(["Work", "GitHub, Inc.", "https://github.com", "Code & PRs"]);
    expect(rows[2]).toEqual(["Personal", 'Video "Fun"', "https://youtube.com", "Line 1\nLine 2"]);
  });

  it("handles UTF-8 BOM in CSV", () => {
    const csv = '\uFEFFContainer,Title,URL\nDev,React,https://react.dev';
    const rows = parseCSV(csv);
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toBe("Container");
    expect(rows[1][1]).toBe("React");
  });

  it("gracefully rejects empty CSV text", () => {
    const res = processImportCSV("", []);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    const resWhitespace = processImportCSV("   \n\r\n  ", []);
    expect(resWhitespace.success).toBe(false);
  });

  it("gracefully rejects CSV without URL column", () => {
    const csv = "Name,Age,Location\nAlice,30,NYC";
    const res = processImportCSV(csv, []);
    expect(res.success).toBe(false);
    expect(res.error).toContain("URL");
  });

  it("imports CSV rows into containers, skips duplicates and invalid URLs", () => {
    const current = [
      {
        id: "c1",
        title: "Work",
        bookmarks: [
          { id: "b1", title: "Existing GitHub", url: "https://github.com" },
        ],
      },
    ];

    const csv = `Folder,Name,Link,Notes
Work,GitHub,https://github.com/,Should be duplicate
Work,Slack,https://slack.com,Team chat
Reading,HN,news.ycombinator.com,News
Reading,Bad,ftp://invalid-url,Invalid protocol
Reading,Blank URL,,No link`;

    const res = processImportCSV(csv, current);
    expect(res.success).toBe(true);
    expect(res.report.bookmarksAdded).toBe(2); // Slack, HN
    expect(res.report.duplicatesSkipped).toBe(1); // GitHub
    expect(res.report.invalidSkipped).toBe(2); // ftp, Blank URL
    expect(res.report.containersCreated).toBe(1); // Reading
    expect(res.report.containersMergedInto).toBe(1); // Work

    // Check containers
    const work = res.nextContainers.find((c) => c.title === "Work");
    expect(work.bookmarks.length).toBe(2); // b1 + Slack
    const reading = res.nextContainers.find((c) => c.title === "Reading");
    expect(reading.bookmarks.length).toBe(1); // HN
    expect(reading.bookmarks[0].url).toBe("https://news.ycombinator.com/");
  });

  it("auto-generates title from hostname if title is empty in CSV", () => {
    const csv = "URL\nhttps://developer.mozilla.org/en-US/";
    const res = processImportCSV(csv, []);
    expect(res.success).toBe(true);
    expect(res.report.bookmarksAdded).toBe(1);
    expect(res.nextContainers[0].bookmarks[0].title).toBe("developer.mozilla.org");
  });
});

describe("hooks/useStore.js reducer", () => {
  it("handles SET_USE_DIVIDERS action", () => {
    const state = getDefaultData();
    expect(state.settings.useDividers).toBe(false);

    const nextState = storeReducer(state, { type: "SET_USE_DIVIDERS", payload: true });
    expect(nextState.settings.useDividers).toBe(true);

    const backState = storeReducer(nextState, { type: "SET_USE_DIVIDERS", payload: false });
    expect(backState.settings.useDividers).toBe(false);
  });

  it("handles TOGGLE_USE_DIVIDERS action", () => {
    const state = getDefaultData();
    expect(state.settings.useDividers).toBe(false);

    const toggledOn = storeReducer(state, { type: "TOGGLE_USE_DIVIDERS" });
    expect(toggledOn.settings.useDividers).toBe(true);

    const toggledOff = storeReducer(toggledOn, { type: "TOGGLE_USE_DIVIDERS" });
    expect(toggledOff.settings.useDividers).toBe(false);
  });

  it("handles SET_APPEARANCE action (icon-only, compact, relaxed, and legacy extended)", () => {
    const state = getDefaultData();
    expect(state.settings.appearance).toBe("relaxed");

    const compact = storeReducer(state, { type: "SET_APPEARANCE", payload: "compact" });
    expect(compact.settings.appearance).toBe("compact");

    const iconOnly = storeReducer(compact, { type: "SET_APPEARANCE", payload: "icon-only" });
    expect(iconOnly.settings.appearance).toBe("icon-only");

    const relaxed = storeReducer(iconOnly, { type: "SET_APPEARANCE", payload: "relaxed" });
    expect(relaxed.settings.appearance).toBe("relaxed");

    // Legacy 'extended' payload normalizes to 'relaxed'
    const legacy = storeReducer(compact, { type: "SET_APPEARANCE", payload: "extended" });
    expect(legacy.settings.appearance).toBe("relaxed");
  });
});



