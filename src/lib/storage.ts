import type { SimpleInputs } from "./types";

export type SavedDesign = {
  id: string;
  name: string;
  savedAt: string;
  input: SimpleInputs;
};

const STORAGE_KEY = "wbc.saved-designs.v2";
const LEGACY_KEY = "wbc.saved-designs.v1";

export function loadSavedDesigns(): SavedDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValid);
    }
    // Legacy migration: discard old format silently (the v1 shape used
    // PresetConfig which can't be safely auto-mapped to a style).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) window.localStorage.removeItem(LEGACY_KEY);
    return [];
  } catch {
    return [];
  }
}

export function writeSavedDesigns(designs: SavedDesign[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
}

export function newDesignId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function isValid(d: unknown): d is SavedDesign {
  if (!d || typeof d !== "object") return false;
  const x = d as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    typeof x.savedAt === "string" &&
    !!x.input &&
    typeof (x.input as Record<string, unknown>).styleId === "string"
  );
}
