import { hasCover } from "./game/rules";
import type { Coord, GameState, UnitKind } from "./game/types";

export const CELL = 44;

function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function boardPixelSize(state: GameState): { width: number; height: number } {
  return { width: state.width * CELL, height: state.height * CELL };
}

export interface TargetHighlight {
  coord: Coord;
  accuracy: number;
}

export interface RenderOptions {
  selected: Coord | null;
  reachableTiles: Coord[];
  targets: TargetHighlight[];
}

const KIND_COLOR: Record<UnitKind, string> = {
  agent: "#2a6fdb",
  president: "#d4af37",
  brawler: "#c0392b",
  chucker: "#a34fb0",
};

const KIND_GLYPH: Record<UnitKind, string> = {
  agent: "SS",
  president: "★",
  brawler: "B",
  chucker: "C",
};

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

  if (opts.reachableTiles.length) {
    ctx.fillStyle = "rgba(255, 221, 87, 0.5)";
    for (const c of opts.reachableTiles) {
      const x = c.col * CELL + CELL / 2;
      const y = c.row * CELL + CELL / 2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const t of opts.targets) {
    const x = t.coord.col * CELL + CELL / 2;
    const y = t.coord.row * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(224, 70, 55, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffdd57";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${t.accuracy}%`, x, y - 24);
  }

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const piece = state.board[row][col];
      if (!piece) continue;
      const coord = { row, col };
      const cx = col * CELL + CELL / 2;
      const cy = row * CELL + CELL / 2;
      const radius = piece.kind === "president" ? 17 : 14;

      if (hasCover(state, coord)) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(120, 200, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = KIND_COLOR[piece.kind];
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      const selected = opts.selected && sameCoord(opts.selected, coord);
      if (selected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffdd57";
        ctx.stroke();
      } else if (piece.onOverwatch) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#4fd0e0";
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.stroke();
      }

      ctx.fillStyle = "#fff";
      ctx.font = piece.kind === "president" ? "14px system-ui, sans-serif" : "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(KIND_GLYPH[piece.kind], cx, cy + 1);

      if (piece.team === "defender" && piece.ap > 0) {
        ctx.fillStyle = "#ffdd57";
        for (let i = 0; i < piece.ap; i++) {
          ctx.beginPath();
          ctx.arc(cx - 6 + i * 6, cy + radius + 6, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.textBaseline = "alphabetic";
}
