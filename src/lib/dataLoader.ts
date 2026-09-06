const cache = new Map<string, unknown>();

export async function loadData<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached !== undefined) return cached as T;

  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

export function preloadData(path: string): void {
  if (cache.has(path)) return;
  loadData(path).catch(() => {});
}
