import {
  ATTACKER_STARTS,
  DEFENDER_STARTS,
  DIRECTIONS,
  EXIT,
  HEIGHT,
  PRESIDENT_START,
  WIDTH,
  buildTerrain,
  doorCoords,
  inBounds,
  sameCoord,
} from "./board";
import type { Cell, Coord, GameState, Move, Piece, Team } from "./types";

let nextPieceId = 1;

function makePiece(team: Team, isPresident = false): Piece {
  return { id: nextPieceId++, team, isPresident };
}

const SPAWN_INTERVAL_ROUNDS = 2;
const SPAWN_COUNT_PER_WAVE = 1;

export function createInitialState(): GameState {
  const board: Cell[][] = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => null as Cell),
  );

  for (const c of DEFENDER_STARTS) board[c.row][c.col] = makePiece("defender");
  for (const c of ATTACKER_STARTS) board[c.row][c.col] = makePiece("attacker");
  board[PRESIDENT_START.row][PRESIDENT_START.col] = makePiece("defender", true);

  return {
    width: WIDTH,
    height: HEIGHT,
    terrain: buildTerrain(),
    doors: doorCoords(),
    exit: { ...EXIT },
    board,
    presidentPos: { ...PRESIDENT_START },
    phase: "defender-phase",
    winner: null,
    log: ["The motorcade holds at the corner. Get the President to the car."],
    roundsUntilSpawn: SPAWN_INTERVAL_ROUNDS,
  };
}

export function cloneState(state: GameState): GameState {
  return {
    width: state.width,
    height: state.height,
    terrain: state.terrain.map((row) => [...row]),
    doors: state.doors.map((c) => ({ ...c })),
    exit: { ...state.exit },
    board: state.board.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
    presidentPos: { ...state.presidentPos },
    phase: state.phase,
    winner: state.winner,
    log: [...state.log],
    roundsUntilSpawn: state.roundsUntilSpawn,
  };
}

function pieceAt(state: GameState, c: Coord): Cell {
  return state.board[c.row][c.col];
}

function isWall(state: GameState, c: Coord): boolean {
  return state.terrain[c.row][c.col] === "wall";
}

// Sliding rook-style moves, blocked by walls and other pieces alike.
export function legalMovesFrom(state: GameState, from: Coord): Coord[] {
  const piece = pieceAt(state, from);
  if (!piece) return [];

  const moves: Coord[] = [];
  for (const dir of DIRECTIONS) {
    let cur: Coord = { row: from.row + dir.row, col: from.col + dir.col };
    while (inBounds(cur) && !isWall(state, cur) && !pieceAt(state, cur)) {
      moves.push({ ...cur });
      cur = { row: cur.row + dir.row, col: cur.col + dir.col };
    }
  }
  return moves;
}

export function allLegalMoves(state: GameState, team: Team): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
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

// A square is a hostile flank against `victim` if it holds an enemy piece,
// or if it's a wall/off-board (pinning a piece against the buildings lets
// a single attacker capture it, same as pinning it against a friendly piece).
function isHostileFlank(state: GameState, at: Coord, victim: Piece): boolean {
  if (!inBounds(at)) return true;
  if (isWall(state, at)) return true;
  const occupant = pieceAt(state, at);
  if (!occupant) return false;
  return isEnemyOf(occupant, victim);
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

// The president is captured once every orthogonal side is either a wall,
// the board edge, or an attacker — cornered against the buildings counts.
function checkPresidentCaptured(state: GameState): boolean {
  const pos = state.presidentPos;
  for (const dir of DIRECTIONS) {
    const c: Coord = { row: pos.row + dir.row, col: pos.col + dir.col };
    if (!inBounds(c) || isWall(state, c)) continue;
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

  if (piece.isPresident && sameCoord(move.to, state.exit)) {
    presidentEscaped = true;
    state.winner = "defenders";
  }

  return { captured, presidentCaptured, presidentEscaped };
}

// Endless protestor supply: every couple of rounds, new attackers spill out
// of any building doors that are currently clear. Defenders never get this.
export function spawnAttackers(state: GameState): Coord[] {
  state.roundsUntilSpawn -= 1;
  if (state.roundsUntilSpawn > 0) return [];
  state.roundsUntilSpawn = SPAWN_INTERVAL_ROUNDS;

  const openDoors = state.doors.filter((d) => !pieceAt(state, d));
  if (openDoors.length === 0) return [];

  const spawned: Coord[] = [];
  for (let i = 0; i < SPAWN_COUNT_PER_WAVE && openDoors.length > 0; i++) {
    const idx = Math.floor(Math.random() * openDoors.length);
    const [door] = openDoors.splice(idx, 1);
    state.board[door.row][door.col] = makePiece("attacker");
    spawned.push(door);
  }
  return spawned;
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
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const piece = state.board[row][col];
      if (piece && piece.team === "attacker") {
        const d = Math.abs(row - at.row) + Math.abs(col - at.col);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

export function exitDistance(state: GameState, at: Coord): number {
  return Math.abs(state.exit.row - at.row) + Math.abs(state.exit.col - at.col);
}

export { sameCoord };
