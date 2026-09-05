import type { Coord, Terrain, UnitKind } from "./types";

export const DIRECTIONS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function inBounds(c: Coord, width: number, height: number): boolean {
  return c.row >= 0 && c.row < height && c.col >= 0 && c.col < width;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

// Compact per-level tuning knobs. `buildLevel` turns one of these into a
// full, ready-to-play layout (terrain, doors, exit, starting positions).
export interface LevelConfig {
  id: string;
  name: string;
  briefing: string;
  width: number;
  height: number;
  doorRows: number[];
  barricadeRows?: number[];
  numDefenders: number;
  numBrawlers: number;
  numChuckers: number;
  spawnIntervalRounds: number;
  spawnCountPerWave: number;
  // Chance each newly-spawned protestor is a chucker rather than a brawler.
  chuckerSpawnChance: number;
}

export interface Level {
  id: string;
  name: string;
  briefing: string;
  width: number;
  height: number;
  terrain: Terrain[][];
  doors: Coord[];
  exit: Coord;
  presidentStart: Coord;
  defenderStarts: Coord[];
  attackerStarts: Array<{ coord: Coord; kind: UnitKind }>;
  spawnIntervalRounds: number;
  spawnCountPerWave: number;
  chuckerSpawnChance: number;
}

// Offsets radiating out from the president's start square, in the order
// defenders fill them. Deliberately fixed (not random) so every attempt at
// a level starts from the same protective formation.
const DEFENDER_CLUSTER_OFFSETS: Coord[] = [
  { row: -1, col: 0 },
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: -2, col: 0 },
  { row: -2, col: -1 },
  { row: -2, col: 1 },
  { row: -1, col: -2 },
  { row: -1, col: 2 },
  { row: 0, col: -2 },
  { row: 0, col: 2 },
];

function buildDefenderStarts(presidentStart: Coord, count: number): Coord[] {
  return DEFENDER_CLUSTER_OFFSETS.slice(0, count).map((o) => ({
    row: presidentStart.row + o.row,
    col: presidentStart.col + o.col,
  }));
}

// Deterministic zigzag scatter across the open street, leaving a buffer
// near the exit and near the motorcade's own starting cluster.
function scatterCoords(terrain: Terrain[][], width: number, height: number, count: number): Coord[] {
  const interiorCols: number[] = [];
  for (let col = 1; col < width - 1; col++) interiorCols.push(col);

  const coords: Coord[] = [];
  const rowStart = 2;
  const rowEnd = height - 4;
  const step = Math.max(1, Math.floor(interiorCols.length / 3));

  for (let row = rowStart; row <= rowEnd && coords.length < count; row += 2) {
    const offset = Math.floor(step / 2) * ((row / 2) % 2);
    for (let i = offset; i < interiorCols.length && coords.length < count; i += step) {
      const col = interiorCols[i];
      if (terrain[row][col] === "open") coords.push({ row, col });
    }
  }

  // Fallback: if the zigzag couldn't place enough (very small/odd levels),
  // sweep every open interior cell in the same band until count is met.
  for (let row = rowStart; row <= rowEnd && coords.length < count; row++) {
    for (const col of interiorCols) {
      if (coords.length >= count) break;
      if (terrain[row][col] !== "open") continue;
      if (coords.some((c) => c.row === row && c.col === col)) continue;
      coords.push({ row, col });
    }
  }

  return coords;
}

// Interleaves brawler/chucker assignments proportionally across the
// scattered coordinates, so the initial crowd is a mix throughout the
// street rather than clustered by type.
function assignKinds(count: number, brawlers: number, chuckers: number): UnitKind[] {
  const kinds: UnitKind[] = [];
  let bRemaining = brawlers;
  let cRemaining = chuckers;
  for (let i = 0; i < count; i++) {
    const bFrac = brawlers === 0 ? -1 : bRemaining / brawlers;
    const cFrac = chuckers === 0 ? -1 : cRemaining / chuckers;
    if (bFrac >= cFrac) {
      kinds.push("brawler");
      bRemaining--;
    } else {
      kinds.push("chucker");
      cRemaining--;
    }
  }
  return kinds;
}

export function buildLevel(config: LevelConfig): Level {
  const { width, height, doorRows, barricadeRows = [] } = config;
  const leftCol = 0;
  const rightCol = width - 1;
  const doorRowSet = new Set(doorRows);

  const terrain: Terrain[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "open" as Terrain),
  );

  for (let row = 0; row < height; row++) {
    terrain[row][leftCol] = doorRowSet.has(row) ? "door" : "wall";
    terrain[row][rightCol] = doorRowSet.has(row) ? "door" : "wall";
  }

  // Interior barricades: a wall clear across the street but for one gap,
  // alternating which side the gap falls on so the safe path zigzags.
  const interiorCols: number[] = [];
  for (let col = leftCol + 1; col < rightCol; col++) interiorCols.push(col);
  barricadeRows.forEach((row, i) => {
    const gapCol =
      i % 2 === 0
        ? interiorCols[Math.floor(interiorCols.length * 0.25)]
        : interiorCols[Math.floor(interiorCols.length * 0.75)];
    for (const col of interiorCols) {
      terrain[row][col] = col === gapCol ? "open" : "wall";
    }
  });

  const doors: Coord[] = [];
  for (const row of doorRows) {
    doors.push({ row, col: leftCol });
    doors.push({ row, col: rightCol });
  }

  const centerCol = Math.floor(width / 2);
  const exit: Coord = { row: 0, col: centerCol };
  const presidentStart: Coord = { row: height - 1, col: centerCol };
  const defenderStarts = buildDefenderStarts(presidentStart, config.numDefenders);

  const attackerCount = config.numBrawlers + config.numChuckers;
  const coords = scatterCoords(terrain, width, height, attackerCount);
  const kinds = assignKinds(attackerCount, config.numBrawlers, config.numChuckers);
  const attackerStarts = coords.map((coord, i) => ({ coord, kind: kinds[i] }));

  return {
    id: config.id,
    name: config.name,
    briefing: config.briefing,
    width,
    height,
    terrain,
    doors,
    exit,
    presidentStart,
    defenderStarts,
    attackerStarts,
    spawnIntervalRounds: config.spawnIntervalRounds,
    spawnCountPerWave: config.spawnCountPerWave,
    chuckerSpawnChance: config.chuckerSpawnChance,
  };
}

export const LEVELS: LevelConfig[] = [
  {
    id: "first-block",
    name: "First Block",
    briefing: "One block between here and the car. Keep it tight.",
    width: 9,
    height: 15,
    doorRows: [2, 4, 6, 8, 10, 12],
    numDefenders: 6,
    numBrawlers: 8,
    numChuckers: 2,
    spawnIntervalRounds: 2,
    spawnCountPerWave: 1,
    chuckerSpawnChance: 0.2,
  },
  {
    id: "market-street",
    name: "Market Street",
    briefing: "Bigger crowd today, and some of them are throwing things. Watch your lines.",
    width: 9,
    height: 17,
    doorRows: [2, 4, 6, 8, 10, 12, 14],
    numDefenders: 6,
    numBrawlers: 8,
    numChuckers: 4,
    spawnIntervalRounds: 2,
    spawnCountPerWave: 1,
    chuckerSpawnChance: 0.3,
  },
  {
    id: "barricade-ave",
    name: "Barricade Avenue",
    briefing: "They've thrown up a barricade. Funnel through the gap — so will they.",
    width: 9,
    height: 17,
    doorRows: [2, 4, 6, 8, 10, 12, 14],
    barricadeRows: [9],
    numDefenders: 6,
    numBrawlers: 8,
    numChuckers: 6,
    spawnIntervalRounds: 2,
    spawnCountPerWave: 2,
    chuckerSpawnChance: 0.35,
  },
  {
    id: "capitol-approach",
    name: "Capitol Approach",
    briefing: "Wider street, two checkpoints, no time to rest.",
    width: 11,
    height: 19,
    doorRows: [2, 4, 6, 8, 10, 12, 14, 16],
    barricadeRows: [7, 13],
    numDefenders: 7,
    numBrawlers: 8,
    numChuckers: 8,
    spawnIntervalRounds: 1,
    spawnCountPerWave: 1,
    chuckerSpawnChance: 0.4,
  },
  {
    id: "motorcade-mile",
    name: "The Motorcade Mile",
    briefing: "Last stretch. Everyone who can walk is out here today.",
    width: 11,
    height: 21,
    doorRows: [2, 4, 6, 8, 10, 12, 14, 16, 18],
    barricadeRows: [6, 12, 16],
    numDefenders: 8,
    numBrawlers: 10,
    numChuckers: 10,
    spawnIntervalRounds: 1,
    spawnCountPerWave: 2,
    chuckerSpawnChance: 0.5,
  },
];
