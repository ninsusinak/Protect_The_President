export type Team = "defender" | "attacker";

// agent = Secret Service (defender team). president = the objective (also
// nominally "defender" team for cover/AI purposes, but never attacks).
// brawler/chucker = the two protestor archetypes (attacker team).
export type UnitKind = "agent" | "president" | "brawler" | "chucker";

export interface Piece {
  id: number;
  team: Team;
  kind: UnitKind;
  ap: number;
  onOverwatch: boolean;
}

export interface Coord {
  row: number;
  col: number;
}

export type Cell = Piece | null;

// "wall" = building frontage, fully impassable, but grants cover to units
// standing next to it. "door" = a gap in the building where protestors
// spawn in from; walkable, no cover. "open" = plain street.
export type Terrain = "open" | "wall" | "door";

export type Phase = "defender-phase" | "president-phase" | "attacker-phase";

export type Winner = "defenders" | "attackers" | null;

export interface GameState {
  width: number;
  height: number;
  terrain: Terrain[][];
  doors: Coord[];
  exit: Coord;
  board: Cell[][];
  presidentPos: Coord;
  phase: Phase;
  winner: Winner;
  log: string[];
  roundsUntilSpawn: number;
  spawnIntervalRounds: number;
  spawnCountPerWave: number;
  chuckerSpawnChance: number;
  // Rounds of forced escape-priority behavior remaining, refreshed to 2
  // whenever an agent is adjacent to the President — see
  // rules.isPresidentEscorted and presidentAI.decidePresidentMove.
  presidentEscortBoost: number;
}
