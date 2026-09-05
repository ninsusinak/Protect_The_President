import { manhattan } from "./board";
import {
  allPiecesOfTeam,
  attackableTargets,
  findPieceCoord,
  performAttack,
  performMove,
  reachableTiles,
  type Targetable,
} from "./rules";
import { statsFor } from "./units";
import type { Coord, GameState, Piece, Team, UnitKind } from "./types";

export interface CombatEvent {
  actorTeam: Team;
  actorKind: UnitKind;
  action: "attack" | "reaction";
  hit: boolean;
  targetKind?: UnitKind;
  presidentCaptured?: boolean;
}

function pickBestTarget(targets: Targetable[]): Targetable {
  const presidentTarget = targets.find((t) => t.piece.kind === "president");
  if (presidentTarget) return presidentTarget;
  let best = targets[0];
  for (const t of targets) if (t.accuracy > best.accuracy) best = t;
  return best;
}

function nearestAgentCoord(state: GameState, from: Coord): Coord | null {
  let best: Coord | null = null;
  let bestDist = Infinity;
  for (const { piece, coord } of allPiecesOfTeam(state, "defender")) {
    if (piece.kind !== "agent") continue;
    const d = manhattan(from, coord);
    if (d < bestDist) {
      bestDist = d;
      best = coord;
    }
  }
  return best;
}

function bestStepToward(state: GameState, from: Coord, goal: Coord, moveRange: number): Coord | null {
  const options = reachableTiles(state, from, moveRange);
  if (options.length === 0) return null;
  const minDist = Math.min(...options.map((c) => manhattan(c, goal)));
  const top = options.filter((c) => manhattan(c, goal) === minDist);
  return top[Math.floor(Math.random() * top.length)];
}

// Greedy per-unit AI: every protestor with AP left either takes the best
// shot available, or spends its move closing on its objective — brawlers
// beeline for the president (the only ones who can actually grab them),
// chuckers head for the nearest agent they can pepper from range.
export function runAttackerTurn(state: GameState): CombatEvent[] {
  const events: CombatEvent[] = [];
  const unitIds = allPiecesOfTeam(state, "attacker").map(({ piece }) => piece.id);

  for (const unitId of unitIds) {
    for (let i = 0; i < 2; i++) {
      if (state.winner) return events;

      const coord = findPieceCoord(state, unitId);
      if (!coord) break;
      const piece: Piece = state.board[coord.row][coord.col]!;
      if (piece.ap <= 0) break;

      const targets = attackableTargets(state, piece, coord);
      if (targets.length > 0) {
        const target = pickBestTarget(targets);
        const result = performAttack(state, unitId, target.piece.id);
        if (result.attempted) {
          events.push({
            actorTeam: "attacker",
            actorKind: piece.kind,
            action: "attack",
            hit: result.hit,
            targetKind: target.piece.kind,
            presidentCaptured: result.presidentCaptured,
          });
        }
        if (state.winner) return events;
        continue;
      }

      const goal = piece.kind === "brawler" ? state.presidentPos : (nearestAgentCoord(state, coord) ?? state.presidentPos);
      const dest = bestStepToward(state, coord, goal, statsFor(piece.kind).moveRange);
      if (!dest) {
        piece.ap = 0;
        break;
      }

      const moveResult = performMove(state, unitId, dest);
      for (const shot of moveResult.overwatchShots) {
        events.push({ actorTeam: "defender", actorKind: "agent", action: "reaction", hit: shot.hit });
      }
      if (state.winner) return events;
      if (moveResult.eliminated) break;
    }
  }

  return events;
}
