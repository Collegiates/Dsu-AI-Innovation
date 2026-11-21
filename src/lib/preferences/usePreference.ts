"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parsePreference, PREFERENCES_EVENT, readPreference, storageKey, writePreference, type PreferenceKey, type Preferences } from "./storage";

function subscribe(onChange: () => void): () => void {
  // "storage" fires when another tab saves; PREFERENCES_EVENT fires when this tab saves.
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFERENCES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFERENCES_EVENT, onChange);
  };
}

function rawValue(key: PreferenceKey): string | null {
  try {
    return window.localStorage.getItem(storageKey(key));
  } catch {
    return null;
  }
}

/**
 * Reads one saved setting in a page and keeps it up to date when it is saved anywhere (this page, another page, another tab).
 * "ready" is false during the first server render, before the browser's saved value can be read, so pages can show
 * a loading state instead of flashing an empty list. save() checks the value and returns false if it couldn't be saved.
 * Example: const { value: list, save } = usePreference("list"); save([...list, entry]).
 */
export function usePreference<K extends PreferenceKey>(key: K) {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => rawValue(key), () => undefined);
  const value = useMemo(() => parsePreference(key, raw ?? null), [key, raw]);
  const save = useCallback(
    (next: Preferences[K] | ((current: Preferences[K]) => Preferences[K])) =>
      writePreference(key, typeof next === "function" ? (next as (c: Preferences[K]) => Preferences[K])(readPreference(key)) : next),
    [key],
  );
  return { value, ready: raw !== undefined, save };
}
