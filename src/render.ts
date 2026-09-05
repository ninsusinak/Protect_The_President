import type { Coord, GameState } from "./game/types";

export const CELL = 44;

function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function boardPixelSize(state: GameState): { width: number; height: number } {
  return { width: state.width * CELL, height: state.height * CELL };
}

export interface RenderOptions {
  selected: Coord | null;
  legalTargets: Coord[];
}

export function renderBoard(ctx: CanvasRenderingContext2D, state: GameState, opts: RenderOptions) {
  const { width: pxW, height: pxH } = boardPixelSize(state);
  ctx.clearRect(0, 0, pxW, pxH);

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const x = col * CELL;
      const y = row * CELL;
      const terrain = state.terrain[row][col];
      const isExit = sameCoord(state.exit, { row, col });

      if (terrain === "wall") {
        ctx.fillStyle = "#232019";
      } else if (terrain === "door") {
        ctx.fillStyle = "#4a3a22";
      } else if (isExit) {
        ctx.fillStyle = "#1f4a2f";
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? "#5c5c52" : "#525248";
      }
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(x, y, CELL, CELL);

      if (terrain === "wall") {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + CELL / 2);
        ctx.lineTo(x + CELL - 4, y + CELL / 2);
        ctx.stroke();
      } else if (terrain === "door") {
        ctx.fillStyle = "rgba(255,221,87,0.8)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DOOR", x + CELL / 2, y + CELL / 2 + 3);
      } else if (isExit) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("EXIT", x + CELL / 2, y + CELL / 2 + 3);
      }
    }
  }

  if (opts.legalTargets.length) {
    ctx.fillStyle = "rgba(255, 221, 87, 0.55)";
    for (const c of opts.legalTargets) {
      const x = c.col * CELL + CELL / 2;
      const y = c.row * CELL + CELL / 2;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;
      const radius = piece.isPresident ? 17 : 14;

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
      ctx.font = piece.isPresident ? "14px system-ui, sans-serif" : "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const glyph = piece.isPresident ? "★" : piece.team === "defender" ? "SS" : "P";
      ctx.fillText(glyph, cx, cy + 1);
    }
  }
  ctx.textBaseline = "alphabetic";
}
