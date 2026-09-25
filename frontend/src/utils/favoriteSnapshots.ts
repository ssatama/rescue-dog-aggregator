import type { Dog } from "@/types/dog";

/**
 * The last known look of each saved dog, so the favorites page can still show
 * it once the API has nothing for it (#498).
 *
 * Kept beside the id list ("rescue-dogs-favorites:v1"), not inside it: code
 * from before #498 resets a list that is not all numbers, so changing that
 * shape would wipe every visitor's favorites on a rollback or in an old tab.
 */
export interface FavoriteSnapshot {
  name: string;
  image?: string;
  rescue?: string;
  breed?: string;
}

export const SNAPSHOTS_KEY = "rescue-dogs-favorites-snapshots:v1";

type Snapshots = Record<string, FavoriteSnapshot>;

export function readSnapshots(): Snapshots {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Snapshots) : {};
  } catch {
    return {};
  }
}

function write(snapshots: Snapshots): void {
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch {
    // Storage full or blocked: the page falls back to what the API returns
  }
}

function snapshotOf(dog: Dog): FavoriteSnapshot {
  return {
    name: dog.name,
    ...(dog.primary_image_url && { image: dog.primary_image_url }),
    ...(dog.organization?.name && { rescue: dog.organization.name }),
    ...(dog.primary_breed && { breed: dog.primary_breed }),
  };
}

/** Records or refreshes the snapshot of each dog. */
export function rememberDogs(dogs: Dog[]): void {
  if (dogs.length === 0) return;
  const snapshots = readSnapshots();
  for (const dog of dogs) snapshots[String(dog.id)] = snapshotOf(dog);
  write(snapshots);
}

export function forgetDogs(ids: number[]): void {
  const snapshots = readSnapshots();
  for (const id of ids) delete snapshots[String(id)];
  write(snapshots);
}

/** Drops snapshots of dogs no longer saved: removals the page never saw
 * (another tab, a shared link) or a fetch that resolved after a removal. */
export function pruneSnapshots(savedIds: number[]): void {
  const saved = new Set(savedIds.map(String));
  const snapshots = readSnapshots();
  const stale = Object.keys(snapshots).filter((id) => !saved.has(id));
  if (stale.length === 0) return;
  for (const id of stale) delete snapshots[id];
  write(snapshots);
}

/** A saved dog the API returned nothing for, rebuilt from its snapshot. */
export function dogFromSnapshot(id: number, snapshot: FavoriteSnapshot): Dog {
  return {
    id,
    name: snapshot.name,
    primary_image_url: snapshot.image,
    primary_breed: snapshot.breed,
    ...(snapshot.rescue && { organization: { name: snapshot.rescue } }),
  };
}
