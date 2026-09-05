import type { Coord } from "./types";

// Brandub-style 7x7 tafl board: compact enough to read at a glance,
// classic enough that the capture/escape rules stay familiar.
export const SIZE = 7;

export const THRONE: Coord = { row: 3, col: 3 };

export const CORNERS: Coord[] = [
  { row: 0, col: 0 },
  { row: 0, col: 6 },
  { row: 6, col: 0 },
  { row: 6, col: 6 },
];

export function inBounds(c: Coord): boolean {
  return c.row >= 0 && c.row < SIZE && c.col >= 0 && c.col < SIZE;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isThrone(c: Coord): boolean {
  return sameCoord(c, THRONE);
}

export function isCorner(c: Coord): boolean {
  return CORNERS.some((k) => sameCoord(k, c));
}

// Squares no ordinary piece may end its move on, but which still count
// as a hostile flank when working out captures.
export function isRestrictedSquare(c: Coord): boolean {
  return isThrone(c) || isCorner(c);
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
