import type { Coord, GameState } from "./types";
import { exitDistance, nearestAgentDistance, nearestAttackerDistance, reachableTiles } from "./rules";
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

// The President will never *voluntarily* pick a destination further than
// this from the nearest agent, escorted or not. Moving at full (agent-
// matching) range independent of where the escort actually is turned out
// to be lethal in practice: even a low move-probability still occasionally
// let it dash clean across the board alone, arriving well ahead of any
// agent and getting picked off in total isolation. This tether is the
// actual fix — a range/probability cut alone just traded "dies fast" for
// "dies slow to attrition" without ever letting it move safely at pace.
const MAX_TETHER_DISTANCE = 4;

function tetherOptions(state: GameState, options: Coord[]): Coord[] {
  const tethered = options.filter((c) => nearestAgentDistance(state, c) <= MAX_TETHER_DISTANCE);
  return tethered.length > 0 ? tethered : options;
}

// While escorted (or for a couple of rounds after an agent last stood next
// to the President — see rules.ts's presidentEscortBoost), personality goes
// out the window: just get to the exit, dodging danger along the way, no
// reluctance and no detours. This is the one lever the player has over an
// otherwise fully autonomous president.
function decideEscortedMove(state: GameState, options: Coord[]): Coord {
  return pickBestBy(options, (c) => nearestAttackerDistance(state, c) * 2 - exitDistance(state, c) * 3);
}

// Decides whether the (autonomous, non-player-controlled) president spends
// one move action this turn, and where. Called once per remaining AP by the
// caller.
//
// Every bias below weighs exit progress at least somewhat — a personality
// that never factors in the goal at all can wander sideways forever and
// make the level unwinnable regardless of combat balance, no matter how
// "in character" that reads. Danger-avoidance (or lack of it) and
// randomness are what actually distinguish the archetypes.
export function decidePresidentMove(state: GameState, profile: PresidentProfile): Coord | null {
  const from = state.presidentPos;
  const boosted = state.presidentEscortBoost > 0;
  const rawOptions = reachableTiles(state, from, statsFor("president").moveRange);
  if (rawOptions.length === 0) return null;
  const options = tetherOptions(state, rawOptions);

  if (boosted) return decideEscortedMove(state, options);
  if (Math.random() > profile.moveEagerness) return null;

  switch (profile.bias) {
    case "flee":
      // Safety-conscious but still makes for the exit — pure
      // safety-maximizing can send it on endless detours since threats
      // spawn from both sides of the street.
      return pickBestBy(
        options,
        (c) => nearestAttackerDistance(state, c) * 2 - exitDistance(state, c),
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
      return pickBestBy(options, (c) => -exitDistance(state, c) + Math.random() * 3);
  }
}
