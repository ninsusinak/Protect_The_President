import type { GameState, Move } from "./types";
import { allLegalMoves, applyMove, cloneState } from "./rules";

// Simple greedy protestor AI: simulate every legal move, heavily favor
// captures (especially cornering the president), otherwise close the
// distance to the president. Ties broken randomly so games don't play
// out identically every time.
export function decideAttackerMove(state: GameState): Move | null {
  const moves = allLegalMoves(state, "attacker");
  if (moves.length === 0) return null;

  const scored = moves.map((move) => {
    const sim = cloneState(state);
    const result = applyMove(sim, move);

    let score = 0;
    if (result.presidentCaptured) score += 1000;
    score += result.captured.length * 100;

    const distAfter =
      Math.abs(move.to.row - sim.presidentPos.row) + Math.abs(move.to.col - sim.presidentPos.col);
    score += 10 - distAfter;

    return { move, score };
  });

  let best = -Infinity;
  for (const s of scored) best = Math.max(best, s.score);
  const top = scored.filter((s) => s.score >= best - 0.001);
  return top[Math.floor(Math.random() * top.length)].move;
}
