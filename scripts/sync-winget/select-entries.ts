import type { IndexEntry } from "./read-index.js";

export function selectEntriesToFetch(
  indexEntries: IndexEntry[],
  existingVersions: Map<string, string>,
  limit?: number,
): IndexEntry[] {
  const selected = indexEntries.filter((entry) => {
    const existing = existingVersions.get(entry.package_id);
    return existing === undefined || existing !== entry.version;
  });

  if (limit && limit > 0) {
    return selected.slice(0, limit);
  }

  return selected;
}
