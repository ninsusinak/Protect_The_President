import { DIRECTIONS, inBounds as inBoundsRaw, manhattan, sameCoord } from "./board";
import type { Level } from "./board";
import { statsFor } from "./units";
import type { Cell, Coord, GameState, Piece, Team, UnitKind } from "./types";

let nextPieceId = 1;

function makeUnit(team: Team, kind: UnitKind): Piece {
  return { id: nextPieceId++, team, kind, ap: statsFor(kind).maxAp, onOverwatch: false };
}

function inBounds(state: GameState, c: Coord): boolean {
  return inBoundsRaw(c, state.width, state.height);
}

export function createInitialState(level: Level): GameState {
  const board: Cell[][] = Array.from({ length: level.height }, () =>
    Array.from({ length: level.width }, () => null as Cell),
  );

  for (const c of level.defenderStarts) board[c.row][c.col] = makeUnit("defender", "agent");
  for (const { coord, kind } of level.attackerStarts) board[coord.row][coord.col] = makeUnit("attacker", kind);
  board[level.presidentStart.row][level.presidentStart.col] = makeUnit("defender", "president");

  return {
    width: level.width,
    height: level.height,
    terrain: level.terrain.map((row) => [...row]),
    doors: level.doors.map((c) => ({ ...c })),
    exit: { ...level.exit },
    board,
    presidentPos: { ...level.presidentStart },
    phase: "defender-phase",
    winner: null,
    log: [`${level.name}: ${level.briefing}`],
    roundsUntilSpawn: level.spawnIntervalRounds,
    spawnIntervalRounds: level.spawnIntervalRounds,
    spawnCountPerWave: level.spawnCountPerWave,
    chuckerSpawnChance: level.chuckerSpawnChance,
    presidentEscortBoost: 0,
  };
}

export function findPieceCoord(state: GameState, id: number): Coord | null {
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      if (state.board[row][col]?.id === id) return { row, col };
    }
  }
  return null;
}

function isWall(state: GameState, c: Coord): boolean {
  return state.terrain[c.row][c.col] === "wall";
}

export function hasCover(state: GameState, coord: Coord): boolean {
  for (const dir of DIRECTIONS) {
    const c: Coord = { row: coord.row + dir.row, col: coord.col + dir.col };
    if (inBounds(state, c) && isWall(state, c)) return true;
  }
  return false;
}

// The president can only ever be captured by a melee "grab" — thrown rocks
// or pepper spray don't take them into custody, only physically closing in.
export function canTarget(attackerKind: UnitKind, targetKind: UnitKind): boolean {
  if (targetKind === "president") return statsFor(attackerKind).isMelee;
  return true;
}

export interface AccuracyOptions {
  reaction?: boolean;
}

export function computeAccuracy(
  state: GameState,
  attacker: Piece,
  attackerCoord: Coord,
  targetCoord: Coord,
  opts: AccuracyOptions = {},
): number {
  const stats = statsFor(attacker.kind);
  let acc = stats.baseAccuracy;

  if (!stats.isMelee) {
    const dist = manhattan(attackerCoord, targetCoord);
    acc -= Math.max(0, dist - 2) * 8;
    if (hasCover(state, targetCoord)) acc -= 25;
  }

  if (opts.reaction) acc -= 10;

  return Math.max(5, Math.min(95, Math.round(acc)));
}

// BFS movement bounded by the unit's move range for this action. Walls and
// other units both block passage — no sliding through the crowd or walls.
export function reachableTiles(state: GameState, from: Coord, range: number): Coord[] {
  const key = (c: Coord) => `${c.row},${c.col}`;
  const visited = new Set<string>([key(from)]);
  const result: Coord[] = [];
  let frontier: Coord[] = [from];

  for (let step = 0; step < range && frontier.length > 0; step++) {
    const next: Coord[] = [];
    for (const c of frontier) {
      for (const dir of DIRECTIONS) {
        const n: Coord = { row: c.row + dir.row, col: c.col + dir.col };
        if (!inBounds(state, n) || visited.has(key(n))) continue;
        if (isWall(state, n) || state.board[n.row][n.col]) continue;
        visited.add(key(n));
        result.push(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return result;
}

export function piecesInRange(
  state: GameState,
  from: Coord,
  range: number,
  opts: { team?: Team } = {},
): Array<{ piece: Piece; coord: Coord }> {
  const found: Array<{ piece: Piece; coord: Coord }> = [];
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      if (row === from.row && col === from.col) continue;
      const piece = state.board[row][col];
      if (!piece) continue;
      if (opts.team && piece.team !== opts.team) continue;
      const coord: Coord = { row, col };
      if (manhattan(from, coord) > range) continue;
      found.push({ piece, coord });
    }
  }
  return found;
}

export interface Targetable {
  piece: Piece;
  coord: Coord;
  accuracy: number;
}

export function attackableTargets(state: GameState, attacker: Piece, attackerCoord: Coord): Targetable[] {
  const stats = statsFor(attacker.kind);
  if (!stats.canAttack || attacker.ap <= 0) return [];
  const enemyTeam: Team = attacker.team === "defender" ? "attacker" : "defender";
  return piecesInRange(state, attackerCoord, stats.attackRange, { team: enemyTeam })
    .filter(({ piece }) => canTarget(attacker.kind, piece.kind))
    .map(({ piece, coord }) => ({
      piece,
      coord,
      accuracy: computeAccuracy(state, attacker, attackerCoord, coord),
    }));
}

export interface OverwatchShotResult {
  watcherId: number;
  watcherCoord: Coord;
  hit: boolean;
  accuracy: number;
}

function triggerOverwatchReactions(
  state: GameState,
  startCoord: Coord,
  moverTeam: Team,
  moverId: number,
): OverwatchShotResult[] {
  const results: OverwatchShotResult[] = [];
  let moverCoord: Coord | null = startCoord;
  void moverId;

  for (let row = 0; row < state.height && moverCoord; row++) {
    for (let col = 0; col < state.width && moverCoord; col++) {
      const watcher = state.board[row][col];
      if (!watcher || watcher.team === moverTeam || !watcher.onOverwatch) continue;

      const watcherCoord: Coord = { row, col };
      const mover = state.board[moverCoord.row][moverCoord.col];
      if (!mover) break;

      const stats = statsFor(watcher.kind);
      if (manhattan(watcherCoord, moverCoord) > stats.attackRange) continue;
      if (!canTarget(watcher.kind, mover.kind)) continue;

      const accuracy = computeAccuracy(state, watcher, watcherCoord, moverCoord, { reaction: true });
      const hit = Math.random() * 100 < accuracy;
      watcher.onOverwatch = false;
      results.push({ watcherId: watcher.id, watcherCoord, hit, accuracy });

      if (hit) {
        state.board[moverCoord.row][moverCoord.col] = null;
        if (mover.kind === "president") state.winner = "attackers";
        moverCoord = null;
      }
    }
  }

  return results;
}

export interface MoveResult {
  moved: boolean;
  overwatchShots: OverwatchShotResult[];
  eliminated: boolean;
  presidentEscaped: boolean;
}

export function performMove(state: GameState, unitId: number, to: Coord): MoveResult {
  const none: MoveResult = { moved: false, overwatchShots: [], eliminated: false, presidentEscaped: false };
  const from = findPieceCoord(state, unitId);
  if (!from) return none;

  const piece = state.board[from.row][from.col]!;
  if (piece.ap <= 0) return none;

  state.board[from.row][from.col] = null;
  state.board[to.row][to.col] = piece;
  piece.ap -= 1;
  if (piece.kind === "president") state.presidentPos = { ...to };

  const overwatchShots = triggerOverwatchReactions(state, to, piece.team, piece.id);
  const eliminated = overwatchShots.some((s) => s.hit);

  let presidentEscaped = false;
  if (!eliminated && piece.kind === "president" && sameCoord(to, state.exit)) {
    presidentEscaped = true;
    state.winner = "defenders";
  }

  return { moved: true, overwatchShots, eliminated, presidentEscaped };
}

export interface AttackResult {
  attempted: boolean;
  hit: boolean;
  accuracy: number;
  targetEliminated: boolean;
  presidentCaptured: boolean;
}

const NO_ATTACK: AttackResult = {
  attempted: false,
  hit: false,
  accuracy: 0,
  targetEliminated: false,
  presidentCaptured: false,
};

export function performAttack(state: GameState, attackerId: number, targetId: number): AttackResult {
  const attackerCoord = findPieceCoord(state, attackerId);
  const targetCoord = findPieceCoord(state, targetId);
  if (!attackerCoord || !targetCoord) return NO_ATTACK;

  const attacker = state.board[attackerCoord.row][attackerCoord.col]!;
  const target = state.board[targetCoord.row][targetCoord.col]!;
  if (attacker.ap <= 0) return NO_ATTACK;

  const stats = statsFor(attacker.kind);
  if (!stats.canAttack) return NO_ATTACK;
  if (manhattan(attackerCoord, targetCoord) > stats.attackRange) return NO_ATTACK;
  if (!canTarget(attacker.kind, target.kind)) return NO_ATTACK;

  attacker.ap -= 1;
  const accuracy = computeAccuracy(state, attacker, attackerCoord, targetCoord);
  const hit = Math.random() * 100 < accuracy;

  let presidentCaptured = false;
  if (hit) {
    state.board[targetCoord.row][targetCoord.col] = null;
    if (target.kind === "president") {
      presidentCaptured = true;
      state.winner = "attackers";
    }
  }

  return { attempted: true, hit, accuracy, targetEliminated: hit, presidentCaptured };
}

export function performOverwatch(state: GameState, unitId: number): boolean {
  const coord = findPieceCoord(state, unitId);
  if (!coord) return false;
  const piece = state.board[coord.row][coord.col]!;
  if (piece.ap <= 0) return false;
  piece.ap = 0;
  piece.onOverwatch = true;
  return true;
}

// Resets AP (and clears any standing overwatch) for every piece of the
// given kinds — called once at the start of each side's phase.
export function resetAP(state: GameState, kinds: UnitKind[]): void {
  for (const row of state.board) {
    for (const piece of row) {
      if (piece && kinds.includes(piece.kind)) {
        piece.ap = statsFor(piece.kind).maxAp;
        piece.onOverwatch = false;
      }
    }
  }
}

export function allPiecesOfTeam(state: GameState, team: Team): Array<{ piece: Piece; coord: Coord }> {
  const found: Array<{ piece: Piece; coord: Coord }> = [];
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const piece = state.board[row][col];
      if (piece && piece.team === team) found.push({ piece, coord: { row, col } });
    }
  }
  return found;
}

// Endless protestor supply: every couple of rounds, new attackers spill out
// of any building doors that are currently clear. Defenders never get this.
export function spawnAttackers(state: GameState): Coord[] {
  state.roundsUntilSpawn -= 1;
  if (state.roundsUntilSpawn > 0) return [];
  state.roundsUntilSpawn = state.spawnIntervalRounds;

  const openDoors = state.doors.filter((d) => !state.board[d.row][d.col]);
  if (openDoors.length === 0) return [];

  const spawned: Coord[] = [];
  for (let i = 0; i < state.spawnCountPerWave && openDoors.length > 0; i++) {
    const idx = Math.floor(Math.random() * openDoors.length);
    const [door] = openDoors.splice(idx, 1);
    const kind: UnitKind = Math.random() < state.chuckerSpawnChance ? "chucker" : "brawler";
    state.board[door.row][door.col] = makeUnit("attacker", kind);
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

export function nearestAgentDistance(state: GameState, at: Coord): number {
  let best = Infinity;
  for (const { piece, coord } of allPiecesOfTeam(state, "defender")) {
    if (piece.kind !== "agent") continue;
    const d = manhattan(at, coord);
    if (d < best) best = d;
  }
  return best;
}

export const ESCORT_BOOST_ROUNDS = 2;

// True while at least one agent is standing right next to the President.
export function isPresidentEscorted(state: GameState): boolean {
  return piecesInRange(state, state.presidentPos, 1, { team: "defender" }).some(
    ({ piece }) => piece.kind === "agent",
  );
}

// Call once per round, after the player's moves are locked in: keeping an
// agent glued to the President refreshes the boost back to full; letting it
// lapse just lets the existing countdown continue (handled by
// tickPresidentEscortBoost, called once the President's own move resolves).
export function refreshPresidentEscortBoost(state: GameState): void {
  if (isPresidentEscorted(state)) {
    state.presidentEscortBoost = ESCORT_BOOST_ROUNDS;
  }
}

export function tickPresidentEscortBoost(state: GameState): void {
  state.presidentEscortBoost = Math.max(0, state.presidentEscortBoost - 1);
}

export { manhattan, sameCoord };
