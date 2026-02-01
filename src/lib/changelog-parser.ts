/**
 * Parse CHANGELOG.md into structured data
 * Extracts version headers and their content with categories
 */

interface ChangeCategory {
  category: string;
  items: string[];
}

interface UpdateEntry {
  version: string;
  date: string;
  changes: ChangeCategory[];
}

export function parseChangelog(content: string): UpdateEntry[] {
  const lines = content.split("\n");
  const updates: UpdateEntry[] = [];
  let currentVersion = "";
  let currentDate = "";
  let currentChanges: ChangeCategory[] = [];
  let currentCategory = "";
  let currentItems: string[] = [];

  for (const line of lines) {
    // Match version header: ## [0.4.23] - 2025-12-10
    const versionMatch = line.match(/^## \[([^\]]+)\] - ([^\n]+)$/);
    // Match category header: ### Added
    const categoryMatch = line.match(/^### (.+)$/);

    if (versionMatch) {
      // Save previous category if exists
      if (currentCategory && currentItems.length > 0) {
        currentChanges.push({
          category: currentCategory,
          items: currentItems.filter((c) => c.trim()),
        });
      }

      // Save previous update if exists
      if (currentVersion) {
        updates.push({
          version: currentVersion,
          date: currentDate,
          changes: currentChanges,
        });
      }

      // Start new entry
      currentVersion = versionMatch[1];
      currentDate = versionMatch[2];
      currentChanges = [];
      currentCategory = "";
      currentItems = [];
    } else if (categoryMatch) {
      // Save previous category if exists
      if (currentCategory && currentItems.length > 0) {
        currentChanges.push({
          category: currentCategory,
          items: currentItems.filter((c) => c.trim()),
        });
      }

      // Start new category
      currentCategory = categoryMatch[1];
      currentItems = [];
    } else if (line.startsWith("- ")) {
      // Add change item to current category or uncategorized
      const item = line.substring(2);
      if (currentCategory) {
        currentItems.push(item);
      } else {
        // For old format without categories, treat as "Changes"
        if (!currentCategory) {
          currentCategory = "Changes";
        }
        currentItems.push(item);
      }
    }
  }

  // Save last category if exists
  if (currentCategory && currentItems.length > 0) {
    currentChanges.push({
      category: currentCategory,
      items: currentItems.filter((c) => c.trim()),
    });
  }

  // Add last update
  if (currentVersion) {
    updates.push({
      version: currentVersion,
      date: currentDate,
      changes: currentChanges,
    });
  }

  return updates;
}
