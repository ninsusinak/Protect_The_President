import type { UnitKind } from "./types";

export interface UnitStats {
  maxAp: number;
  moveRange: number;
  attackRange: number;
  baseAccuracy: number;
  isMelee: boolean;
  canAttack: boolean;
  label: string;
}

// Tuning knobs for the whole tactical layer live here. Non-lethal framing
// throughout: agents carry shields/pepper spray/tasers, not firearms;
// protestors carry bats/pipes (melee) or throw rocks and bottles (ranged).
export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  agent: {
    maxAp: 2,
    moveRange: 4,
    attackRange: 4,
    baseAccuracy: 70,
    isMelee: false,
    canAttack: true,
    label: "Secret Service",
  },
  president: {
    // Full parity with everyone else — same AP, same move range. Safety
    // doesn't come from being artificially slow; it comes from
    // presidentAI's tether (never voluntarily strays more than a few tiles
    // from the nearest agent) and the escort-boost mechanic (personality
    // quirks are overridden by keeping an agent adjacent).
    maxAp: 2,
    moveRange: 4,
    attackRange: 0,
    baseAccuracy: 0,
    isMelee: false,
    canAttack: false,
    label: "The President",
  },
  brawler: {
    maxAp: 2,
    moveRange: 4,
    attackRange: 1,
    baseAccuracy: 75,
    isMelee: true,
    canAttack: true,
    label: "Protestor (bat)",
  },
  chucker: {
    maxAp: 2,
    moveRange: 3,
    attackRange: 3,
    baseAccuracy: 55,
    isMelee: false,
    canAttack: true,
    label: "Protestor (thrown)",
  },
};

export function statsFor(kind: UnitKind): UnitStats {
  return UNIT_STATS[kind];
}
