export type Team = "defender" | "attacker";

export interface Piece {
  id: number;
  team: Team;
  isPresident: boolean;
}

export interface Coord {
  row: number;
  col: number;
}

export type Cell = Piece | null;

// "wall" = building frontage, fully impassable.
// "door" = a gap in the building where protestors spawn in from; walkable.
// "open" = plain street.
export type Terrain = "open" | "wall" | "door";

export type Phase = "defender-phase" | "president-phase" | "attacker-phase";

export type Winner = "defenders" | "attackers" | null;

export interface Move {
  from: Coord;
  to: Coord;
}

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
}
