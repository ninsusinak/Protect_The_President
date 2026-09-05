import type { Coord, GameState } from "./types";
import { exitDistance, legalMovesFrom, nearestAttackerDistance } from "./rules";
import type { PresidentProfile } from "./presidents";

function pickBestBy(options: Coord[], score: (c: Coord) => number): Coord {
  let best = -Infinity;
  for (const c of options) best = Math.max(best, score(c));
  const top = options.filter((c) => score(c) >= best - 0.001);
  return top[Math.floor(Math.random() * top.length)];
}

// Decides whether the (autonomous, non-player-controlled) president moves
// this turn, and where, purely from the selected profile's personality.
export function decidePresidentMove(
  state: GameState,
  profile: PresidentProfile,
): Coord | null {
  const from = state.presidentPos;
  const options = legalMovesFrom(state, from);
  if (options.length === 0) return null;
  if (Math.random() > profile.moveEagerness) return null;

  switch (profile.bias) {
    case "flee":
      return pickBestBy(
        options,
        (c) => nearestAttackerDistance(state, c) * 10 - exitDistance(state, c),
      );
    case "bold":
      return pickBestBy(options, (c) => -nearestAttackerDistance(state, c));
    case "stubborn":
      return pickBestBy(
        options,
        (c) => -(Math.abs(c.row - from.row) + Math.abs(c.col - from.col)),
      );
    case "wander":
    default:
      return options[Math.floor(Math.random() * options.length)];
  }
}
