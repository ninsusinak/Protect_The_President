// Single-slot save: how far the player has checkpointed into the campaign,
// plus their chosen president and audio prefs. Level-start checkpoints
// only — a loss just retries the current level, it never touches this.
export interface SaveData {
  levelIndex: number;
  presidentId: string;
  soundEnabled: boolean;
  volume: number;
}

const STORAGE_KEY = "protect-the-president-save-v1";

const DEFAULTS: SaveData = {
  levelIndex: 0,
  presidentId: "showman",
  soundEnabled: true,
  volume: 0.5,
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
