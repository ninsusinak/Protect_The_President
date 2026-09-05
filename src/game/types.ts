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

export type Phase = "defender-phase" | "president-phase" | "attacker-phase";

export type Winner = "defenders" | "attackers" | null;

export interface Move {
  from: Coord;
  to: Coord;
}

export interface GameState {
  board: Cell[][];
  presidentPos: Coord;
  phase: Phase;
  winner: Winner;
  log: string[];
}
