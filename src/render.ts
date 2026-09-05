import { CORNERS, SIZE, THRONE } from "./game/board";
import type { Coord, GameState } from "./game/types";

export const CELL = 64;
export const BOARD_PX = CELL * SIZE;

function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export interface RenderOptions {
  selected: Coord | null;
  legalTargets: Coord[];
}

export function renderBoard(ctx: CanvasRenderingContext2D, state: GameState, opts: RenderOptions) {
  ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const x = col * CELL;
      const y = row * CELL;
      const isThroneCell = row === THRONE.row && col === THRONE.col;
      const isCornerCell = CORNERS.some((c) => c.row === row && c.col === col);

      if (isThroneCell) {
        ctx.fillStyle = "#3a3f2f";
      } else if (isCornerCell) {
        ctx.fillStyle = "#2f3a3f";
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? "#5c5c52" : "#525248";
      }
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(x, y, CELL, CELL);

      if (isCornerCell) {
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ESCAPE", x + CELL / 2, y + CELL / 2 + 4);
      }
    }
  }

  if (opts.legalTargets.length) {
    ctx.fillStyle = "rgba(255, 221, 87, 0.55)";
    for (const c of opts.legalTargets) {
      const x = c.col * CELL + CELL / 2;
      const y = c.row * CELL + CELL / 2;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;
      const radius = piece.isPresident ? 24 : 20;

      if (piece.isPresident) {
        ctx.fillStyle = "#d4af37";
      } else if (piece.team === "defender") {
        ctx.fillStyle = "#2a6fdb";
      } else {
        ctx.fillStyle = "#c0392b";
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      const selected = opts.selected && sameCoord(opts.selected, { row, col });
      if (selected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffdd57";
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.stroke();
      }

      ctx.fillStyle = "#fff";
      ctx.font = piece.isPresident ? "20px system-ui, sans-serif" : "16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const glyph = piece.isPresident ? "★" : piece.team === "defender" ? "SS" : "P";
      ctx.fillText(glyph, cx, cy + 1);
    }
  }
  ctx.textBaseline = "alphabetic";
}
