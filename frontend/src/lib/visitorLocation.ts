"use client";

import { useSyncExternalStore } from "react";
import { trackLocationSet } from "@/lib/analytics";

// Where the visitor lives, for "Adoptable to you" (#493). It only labels dogs;
// hiding the rest is the separate, opt-in `onlyAdoptable` switch.
//
// The visitor's own choice lives in localStorage. Without one, the country
// comes from the connection (/api/geo), cached for the tab only. Nothing is
// ever stored server-side.

export const ANYWHERE = "ANYWHERE";

const CHOICE_KEY = "visitorCountry";
const ONLY_ADOPTABLE_KEY = "onlyAdoptable";
const GEO_KEY = "visitorCountryGeo";

export interface VisitorLocation {
  /** ISO code to label dogs for; null when unknown or the visitor chose Anywhere. */
  country: string | null;
  /** The visitor's own pick: an ISO code, ANYWHERE, or null for none yet. */
  choice: string | null;
  /** Hide dogs that cannot be adopted in `country`; off until turned on. */
  onlyAdoptable: boolean;
}

const SERVER_STATE: VisitorLocation = { country: null, choice: null, onlyAdoptable: false };

let state: VisitorLocation = SERVER_STATE;
let geo: string | null = null;
let loaded = false;
let geoRequested = false;
const listeners = new Set<() => void>();

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page only
  }
}

const local = (): Storage => window.localStorage;
const session = (): Storage => window.sessionStorage;

function update(next: Partial<VisitorLocation>): void {
  const merged = { ...state, ...next };
  merged.country = merged.choice === ANYWHERE ? null : (merged.choice ?? geo);
  state = merged;
  listeners.forEach((listener) => listener());
}

function requestGeo(): void {
  if (geoRequested || typeof fetch !== "function") return;
  geoRequested = true;
  // Started from a resolved promise so any failure lands in the catch below
  Promise.resolve()
    .then(() => fetch("/api/geo"))
    .then((response) => (response.ok ? response.json() : { country: null }))
    .then(({ country }: { country: string | null }) => {
      write(session, GEO_KEY, country ?? "");
      if (!country) return;
      geo = country;
      update({});
      if (!state.choice) trackLocationSet("geo", country, state.onlyAdoptable);
    })
    .catch(() => {
      // No geo: dogs are simply not labelled until the visitor picks
    });
}

function load(): void {
  if (loaded) return;
  loaded = true;
  const cachedGeo = read(session, GEO_KEY);
  geo = cachedGeo || null;
  update({
    choice: read(local, CHOICE_KEY),
    onlyAdoptable: read(local, ONLY_ADOPTABLE_KEY) === "true",
  });
  if (!state.choice && cachedGeo === null) requestGeo();
}

function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setVisitorCountry(choice: string): void {
  write(local, CHOICE_KEY, choice);
  // The switch was about the old country; the visitor turns it on again for the new one
  write(local, ONLY_ADOPTABLE_KEY, null);
  update({ choice, onlyAdoptable: false });
  trackLocationSet("picker", choice === ANYWHERE ? null : choice, false);
}

export function setOnlyAdoptable(onlyAdoptable: boolean): void {
  write(local, ONLY_ADOPTABLE_KEY, onlyAdoptable ? "true" : null);
  update({ onlyAdoptable });
  trackLocationSet(state.choice ? "picker" : "geo", state.country, onlyAdoptable);
}

export function useVisitorLocation(): VisitorLocation {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/** Test hook: forget everything loaded so each test starts from storage. */
export function resetVisitorLocationForTests(): void {
  state = SERVER_STATE;
  geo = null;
  loaded = false;
  geoRequested = false;
  listeners.clear();
}
