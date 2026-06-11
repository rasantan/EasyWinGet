type FavoriteRow = {
  package_id: string;
};

let favoriteIds: Set<string> | null = null;
let loadPromise: Promise<Set<string>> | null = null;

export function invalidateFavoritesCache() {
  favoriteIds = null;
  loadPromise = null;
}

export async function loadFavoriteIds(): Promise<Set<string>> {
  if (favoriteIds) {
    return favoriteIds;
  }

  if (!loadPromise) {
    loadPromise = fetch("/api/favorites")
      .then(async (response) => {
        if (!response.ok) {
          return new Set<string>();
        }
        const data = (await response.json()) as FavoriteRow[];
        return new Set(data.map((row) => row.package_id));
      })
      .catch(() => new Set<string>());
  }

  favoriteIds = await loadPromise;
  loadPromise = null;
  return favoriteIds;
}

export function getCachedFavoriteIds(): Set<string> | null {
  return favoriteIds;
}

export function setCachedFavorite(packageId: string, favorited: boolean) {
  if (!favoriteIds) {
    favoriteIds = new Set<string>();
  }
  if (favorited) {
    favoriteIds.add(packageId);
  } else {
    favoriteIds.delete(packageId);
  }
}
