import type { Coord, Terrain } from "./types";

// A single long street block: building frontage down both sides (with a
// few door gaps protestors spill out of), one guarded intersection at the
// far end to escape through, and the motorcade's starting position at
// the near end.
export const WIDTH = 9;
export const HEIGHT = 15;

const LEFT_WALL_COL = 0;
const RIGHT_WALL_COL = WIDTH - 1;

export const DOOR_ROWS = [2, 4, 6, 8, 10, 12];

export const EXIT: Coord = { row: 0, col: 4 };

export const PRESIDENT_START: Coord = { row: 14, col: 4 };

export const DEFENDER_STARTS: Coord[] = [
  { row: 12, col: 4 },
  { row: 13, col: 3 },
  { row: 13, col: 5 },
  { row: 14, col: 3 },
  { row: 14, col: 5 },
  { row: 13, col: 4 },
];

export const ATTACKER_STARTS: Coord[] = [
  { row: 2, col: 3 },
  { row: 2, col: 5 },
  { row: 3, col: 1 },
  { row: 3, col: 7 },
  { row: 5, col: 4 },
  { row: 6, col: 2 },
  { row: 6, col: 6 },
  { row: 8, col: 4 },
  { row: 9, col: 1 },
  { row: 9, col: 7 },
];

export function buildTerrain(): Terrain[][] {
  const terrain: Terrain[][] = [];
  const doorRowSet = new Set(DOOR_ROWS);
  for (let row = 0; row < HEIGHT; row++) {
    const line: Terrain[] = [];
    for (let col = 0; col < WIDTH; col++) {
      if (col === LEFT_WALL_COL || col === RIGHT_WALL_COL) {
        line.push(doorRowSet.has(row) ? "door" : "wall");
      } else {
        line.push("open");
      }
    }
    terrain.push(line);
  }
  return terrain;
}

export function doorCoords(): Coord[] {
  const doors: Coord[] = [];
  for (const row of DOOR_ROWS) {
    doors.push({ row, col: LEFT_WALL_COL });
    doors.push({ row, col: RIGHT_WALL_COL });
  }
  return doors;
}

export function inBounds(c: Coord): boolean {
  return c.row >= 0 && c.row < HEIGHT && c.col >= 0 && c.col < WIDTH;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export const DIRECTIONS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];
