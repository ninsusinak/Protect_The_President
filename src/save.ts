import type { GameState } from "./game/types";

// Single-slot save: how far the player has checkpointed into the campaign,
// their chosen president, audio prefs, and (if a level is mid-play) a full
// snapshot of the board so Continue can resume exactly where they left off.
// A loss never touches this beyond clearing the snapshot — it just retries
// the current level, checkpoint (levelIndex) unchanged.
export interface SaveData {
  levelIndex: number;
  presidentId: string;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  snapshot: GameState | null;
}

// v2: bumped when the tactical rework changed the Piece/GameState shape —
// old v1 saves are simply ignored rather than crashing on load.
const STORAGE_KEY = "protect-the-president-save-v2";

const DEFAULTS: SaveData = {
  levelIndex: 0,
  presidentId: "showman",
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.5,
  snapshot: null,
};

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || typeof parsed.levelIndex !== "number") {
      return null;
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return null;
  }
}

export function saveProgress(patch: Partial<SaveData>) {
  const merged = { ...(loadSave() ?? DEFAULTS), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Private browsing / storage quota — progress just won't persist.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
