import {
  CORNERS,
  DIRECTIONS,
  SIZE,
  inBounds,
  isCorner,
  isRestrictedSquare,
  isThrone,
  sameCoord,
} from "./board";
import type { Cell, Coord, GameState, Move, Piece, Team } from "./types";

let nextPieceId = 1;

function makePiece(team: Team, isPresident = false): Piece {
  return { id: nextPieceId++, team, isPresident };
}

// Classic Brandub opening array: president on the throne, four defenders
// guarding the cross-points around it, eight attackers on the outer edges.
export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null as Cell),
  );

  const defenderSpots: Coord[] = [
    { row: 2, col: 3 },
    { row: 3, col: 2 },
    { row: 4, col: 3 },
    { row: 3, col: 4 },
  ];
  const attackerSpots: Coord[] = [
    { row: 0, col: 3 },
    { row: 1, col: 3 },
    { row: 6, col: 3 },
    { row: 5, col: 3 },
    { row: 3, col: 0 },
    { row: 3, col: 1 },
    { row: 3, col: 6 },
    { row: 3, col: 5 },
  ];

  for (const c of defenderSpots) board[c.row][c.col] = makePiece("defender");
  for (const c of attackerSpots) board[c.row][c.col] = makePiece("attacker");

  const presidentPos: Coord = { row: 3, col: 3 };
  board[presidentPos.row][presidentPos.col] = makePiece("defender", true);

  return {
    board,
    presidentPos,
    phase: "defender-phase",
    winner: null,
    log: ["The rally is underway. Get the President out safely."],
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
    presidentPos: { ...state.presidentPos },
    phase: state.phase,
    winner: state.winner,
    log: [...state.log],
  };
}

function pieceAt(state: GameState, c: Coord): Cell {
  return state.board[c.row][c.col];
}

// Sliding rook-style moves. Non-president pieces may pass over an empty
// throne/corner square but may never end their move on one.
export function legalMovesFrom(state: GameState, from: Coord): Coord[] {
  const piece = pieceAt(state, from);
  if (!piece) return [];

  const moves: Coord[] = [];
  for (const dir of DIRECTIONS) {
    let cur: Coord = { row: from.row + dir.row, col: from.col + dir.col };
    while (inBounds(cur)) {
      if (pieceAt(state, cur)) break;
      if (isRestrictedSquare(cur) && !piece.isPresident) {
        cur = { row: cur.row + dir.row, col: cur.col + dir.col };
        continue;
      }
      moves.push({ ...cur });
      cur = { row: cur.row + dir.row, col: cur.col + dir.col };
    }
  }
  return moves;
}

export function allLegalMoves(state: GameState, team: Team): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = state.board[row][col];
      if (!piece || piece.team !== team) continue;
      const from = { row, col };
      for (const to of legalMovesFrom(state, from)) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}

function isEnemyOf(piece: Piece, other: Piece): boolean {
  return piece.team !== other.team;
}

// A square is hostile toward `victim` if it holds an enemy piece, or if it's
// an empty throne/corner (those squares are hostile to everyone, standard
// tafl style).
function isHostileFlank(state: GameState, at: Coord, victim: Piece): boolean {
  if (!inBounds(at)) return false;
  const occupant = pieceAt(state, at);
  if (occupant) return isEnemyOf(occupant, victim);
  return isThrone(at) || isCorner(at);
}

function resolveCaptures(state: GameState, moved: Coord): Coord[] {
  const mover = pieceAt(state, moved);
  if (!mover) return [];

  const captured: Coord[] = [];
  for (const dir of DIRECTIONS) {
    const victimPos: Coord = { row: moved.row + dir.row, col: moved.col + dir.col };
    if (!inBounds(victimPos)) continue;
    const victim = pieceAt(state, victimPos);
    if (!victim || !isEnemyOf(mover, victim)) continue;

    if (victim.isPresident) continue; // president has its own capture rule

    const beyond: Coord = { row: victimPos.row + dir.row, col: victimPos.col + dir.col };
    if (isHostileFlank(state, beyond, victim)) {
      state.board[victimPos.row][victimPos.col] = null;
      captured.push(victimPos);
    }
  }
  return captured;
}

// The president is only captured once surrounded on all four orthogonal
// sides by attackers (a deliberately simple "hard" surround rule).
function checkPresidentCaptured(state: GameState): boolean {
  const pos = state.presidentPos;
  for (const dir of DIRECTIONS) {
    const c: Coord = { row: pos.row + dir.row, col: pos.col + dir.col };
    if (!inBounds(c)) return false;
    const occupant = pieceAt(state, c);
    if (!occupant || occupant.team !== "attacker") return false;
  }
  return true;
}

export interface ApplyResult {
  captured: Coord[];
  presidentCaptured: boolean;
  presidentEscaped: boolean;
}

export function applyMove(state: GameState, move: Move): ApplyResult {
  const piece = pieceAt(state, move.from);
  if (!piece) throw new Error("No piece at source square");

  state.board[move.from.row][move.from.col] = null;
  state.board[move.to.row][move.to.col] = piece;
  if (piece.isPresident) {
    state.presidentPos = { ...move.to };
  }

  const captured = resolveCaptures(state, move.to);

  let presidentCaptured = false;
  let presidentEscaped = false;

  if (piece.team === "attacker") {
    presidentCaptured = checkPresidentCaptured(state);
    if (presidentCaptured) state.winner = "attackers";
  }

  if (piece.isPresident && isCorner(move.to)) {
    presidentEscaped = true;
    state.winner = "defenders";
  }

  return { captured, presidentCaptured, presidentEscaped };
}

export function countTeam(state: GameState, team: Team): number {
  let n = 0;
  for (const row of state.board) {
    for (const cell of row) {
      if (cell && cell.team === team) n++;
    }
  }
  return n;
}

export function adjacentAttackerCount(state: GameState, at: Coord): number {
  let n = 0;
  for (const dir of DIRECTIONS) {
    const c: Coord = { row: at.row + dir.row, col: at.col + dir.col };
    if (!inBounds(c)) continue;
    const occupant = pieceAt(state, c);
    if (occupant && occupant.team === "attacker") n++;
  }
  return n;
}

export function nearestAttackerDistance(state: GameState, at: Coord): number {
  let best = Infinity;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = state.board[row][col];
      if (piece && piece.team === "attacker") {
        const d = Math.abs(row - at.row) + Math.abs(col - at.col);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

export function nearestCornerDistance(at: Coord): number {
  let best = Infinity;
  for (const c of CORNERS) {
    const d = Math.abs(c.row - at.row) + Math.abs(c.col - at.col);
    if (d < best) best = d;
  }
  return best;
}

export { sameCoord };
