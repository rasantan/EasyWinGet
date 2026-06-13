function segments(version: string): number[] {
  return version
    .split(/[.\-+]/)
    .map((part) => {
      const numeric = Number.parseInt(part.replace(/[^0-9].*$/, ""), 10);
      return Number.isFinite(numeric) ? numeric : 0;
    });
}

export function compareVersions(a: string, b: string): number {
  const sa = segments(a);
  const sb = segments(b);
  const len = Math.max(sa.length, sb.length);

  for (let i = 0; i < len; i += 1) {
    const diff = (sa[i] ?? 0) - (sb[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function pickLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return versions.reduce((latest, current) =>
    compareVersions(current, latest) > 0 ? current : latest,
  );
}
