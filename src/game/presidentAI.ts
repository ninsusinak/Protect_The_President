import type { Coord, GameState } from "./types";
import { exitDistance, nearestAttackerDistance, reachableTiles } from "./rules";
import { statsFor } from "./units";
import type { PresidentProfile } from "./presidents";

// Precomputes each candidate's score once (a personality's score function may
// be non-deterministic, e.g. "wander"'s random noise) so the winner picked
// is actually the one that scored best, not a re-rolled value.
function pickBestBy(options: Coord[], score: (c: Coord) => number): Coord {
  const scored = options.map((c) => ({ c, s: score(c) }));
  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s >= best - 0.001).map((x) => x.c);
  return top[Math.floor(Math.random() * top.length)];
}

// Decides whether the (autonomous, non-player-controlled) president spends
// one move action this turn, and where, purely from the selected profile's
// personality. Called once per remaining AP by the caller.
//
// Every bias below weighs exit progress at least somewhat — a personality
// that never factors in the goal at all can wander sideways forever and
// make the level unwinnable regardless of combat balance, no matter how
// "in character" that reads. Danger-avoidance (or lack of it) and
// randomness are what actually distinguish the archetypes.
export function decidePresidentMove(state: GameState, profile: PresidentProfile): Coord | null {
  const from = state.presidentPos;
  const options = reachableTiles(state, from, statsFor("president").moveRange);
  if (options.length === 0) return null;
  if (Math.random() > profile.moveEagerness) return null;

  switch (profile.bias) {
    case "flee":
      // Moving only one tile at a time leaves no room for clever
      // detours — heavily weighting "away from the nearest attacker"
      // just derails progress with threats spawning from both sides of
      // the street. Progress leads; safety only breaks ties.
      return pickBestBy(
        options,
        (c) => nearestAttackerDistance(state, c) * 0.5 - exitDistance(state, c),
      );
    case "bold":
      // Reckless, not directionless: heads straight for the exit and
      // simply doesn't factor in nearby danger at all.
      return pickBestBy(options, (c) => -exitDistance(state, c));
    case "stubborn":
      // Reluctant to move (very low moveEagerness already), but on the
      // rare occasion it does, it still makes real progress rather than
      // just taking the smallest possible step in any direction.
      return pickBestBy(options, (c) => -exitDistance(state, c));
    case "wander":
    default:
      // Erratic: generally drifts toward the exit but with enough random
      // noise to take real detours, rather than a coin flip every step.
      return pickBestBy(options, (c) => -exitDistance(state, c) + Math.random() * 2);
  }
}
