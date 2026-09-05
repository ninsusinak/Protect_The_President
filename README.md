# Save the Idiot-in-Chief

Save the Idiot-in-Chief is a browser game inspired by Hnefatafl (Viking chess), reworked into a street-level escort mission. Secret Service defenders (played by you) must get a president — selectable from a roster of satirical archetypes — up the block to a single waiting car, while AI-controlled protestors pour out of the buildings to stop them. The president itself doesn't take orders from anyone — it moves autonomously, with an AI "personality" that mirrors the tone of whichever president you picked.

### Gameplay Overview

- **Objective:** Clear every block in the campaign. Get the president to the exit at the far end of a level to advance to the next one (defenders win the level) or lose the president to the crowd and retry it (attackers win the level).
- **Campaign:** Five hand-tuned levels, each bigger and harder than the last — more doors, more starting protestors, faster spawn waves, and (from level 3 on) interior barricades that force a chokepoint. Beat all five and the campaign is complete.
- **Board:** A long street block. Buildings line both sides; a handful of doors in those buildings are where protestors spawn in from, and standing next to a wall gives a unit cover. There is exactly one exit, at the far end from where the motorcade starts.
- **Tactical combat (XCOM-style):** each round is a full squad turn, not one piece at a time. Every unit gets 2 action points; moving or attacking costs 1 AP, so a unit can move-then-shoot, shoot-then-reposition, or hold **Overwatch** (spend remaining AP to auto-fire on the first enemy that moves into range during the other side's turn). Attacks are a hit-chance roll, not a guaranteed capture — modified by cover, range, and whether it's a reaction shot.
- **Roles:**
  - **Defenders (you) — Agents:** shield/pepper-spray/taser, ranged (range 4), moderate accuracy. A fixed roster sized to the level; once an agent is taken out, they're gone for the rest of that level — no reinforcements. A fresh level means a fresh full roster.
  - **Attackers (AI) — two protestor archetypes:** **Brawlers** carry bats/pipes, melee only (must be adjacent), high accuracy, and are the *only* ones who can actually grab the president (thrown rocks don't count as a capture). **Chuckers** throw rocks/bottles from range, lower accuracy, can hurt agents but can never capture the president. Endless supply — every couple of rounds, new protestors of a random type spill out of any open building door, for as long as the game runs.
  - **The President (AI, autonomous, unarmed):** Not controlled by either side, and deliberately slow — about one square per action, far behind an agent's range. Each round it decides on its own whether and where to move (up to 2 AP worth), biased by its selected personality (flee danger, wander erratically, walk boldly toward the crowd, or dig in and refuse to budge), with flavor-text quotes logged to the Situation Report panel.
- **Movement:** BFS-pathed, bounded by each unit's move range per action — blocked by walls and by other units (no walking through the crowd). The President's range is 1 tile per action; everyone else moves several tiles at a time, which is the whole tension — you have to clear and hold the way, not just outrun the crowd.
- **Hit chance:** base accuracy per unit type, minus a flat penalty if the target is in cover (adjacent to a wall) and a range penalty for ranged attacks past 2 tiles, minus an extra penalty on reaction (Overwatch) shots. Always clamped between 5% and 95% — nothing is ever a sure thing or truly impossible.
- **Framing note:** combat stays non-lethal by design — agents carry shields/spray/tasers, protestors carry bats or throw objects, and outcomes are described as knocked down, grabbed, or pulled from the line, never shot or killed. See `src/game/units.ts` if you want to reskin this.

### Front End

- **Title screen:** pick your president, jump into a new campaign, or continue a saved one.
- **Options:** sound effects on/off, music on/off, volume, clear the saved game — reachable from the title screen or mid-game via the in-game Menu button (which also offers Quit to Title).
- **Checkpoints:** the game saves a full snapshot of the board to `localStorage` every time it's safely your turn — not just on level clear. Close the tab mid-level and Continue picks up on the exact same position, pieces and all. Losing the president never touches the save — it just retries the current level from scratch, full roster restored.
- **Sound:** short SFX (move, hit, miss, agent lost, protestor spawn, danger, level clear, game over, UI clicks) plus a quiet generative four-chord background loop, both synthesized live via the WebAudio API — no audio files to ship.
- **Touch:** the board is a tap target like any other — select an agent, tap a highlighted tile to move it or a ringed enemy to attack it, or use the Overwatch/End Turn buttons. The canvas scales to fit narrow screens while keeping tap coordinates accurate.

### Tech Stack

Vite + TypeScript, rendered to an HTML5 canvas. No build framework beyond Vite; game logic lives in `src/game/` and is UI-agnostic.

### Running the Game

```bash
npm install
npm run dev
```

Then open the printed local URL in a browser.

To produce a static production build:

```bash
npm run build
npm run preview
```

### Project Structure

```
src/
  game/
    types.ts        Core types (board, pieces, moves, game state)
    units.ts         Per-unit-kind stats: AP, move/attack range, accuracy, melee vs ranged
    board.ts         Level system: per-level configs, procedural layout generation (walls/doors/exit/starts)
    rules.ts         Movement (BFS), cover/accuracy math, attacks, overwatch, spawning, win conditions
    presidents.ts    Selectable president roster: personality + flavor text
    presidentAI.ts   Decides the president's autonomous move each round
    attackerAI.ts    Per-unit AP loop for protestors: attack if in range, else close on target
  render.ts          Canvas rendering (units, cover rings, overwatch rings, AP pips, target hit%)
  sound.ts           Synthesized SFX + generative background music (WebAudio, no asset files)
  save.ts            localStorage save data: checkpoint level, president, audio prefs, mid-level snapshot
  main.ts            App wiring: screens, DOM, input handling, turn loop
```

### The Campaign

`src/game/board.ts` exports `LEVELS`, an ordered array of `LevelConfig` objects — each one just a handful of tuning knobs (dimensions, which rows have doors, which rows have a barricade, defender count, brawler/chucker counts, spawn rate, and the odds a new spawn is a chucker). `buildLevel()` turns a config into a full playable layout deterministically (fixed defender formation, fixed zigzag attacker scatter interleaved by type — no randomness in the geometry itself, only in how the AI plays it and who wins each hit-chance roll). Add a level by appending another config to `LEVELS`; nothing else needs to change. The shipped campaign:

1. **First Block** — the introduction.
2. **Market Street** — bigger, more doors.
3. **Barricade Avenue** — first interior chokepoint, faster spawn waves.
4. **Capitol Approach** — wider street, two checkpoints, spawns every round.
5. **The Motorcade Mile** — the finale: biggest board, most protestors, most barricades.

`src/game/presidents.ts` is a plain data file — the shipped roster is a set of fictional archetypes (`The Showman`, `The Statesman`, `The Wildcard`, `The Isolationist`) so the satire targets a *type* of politician rather than a specific real person. Swap in real historical presidents there if you want a more pointed roster; nothing else in the codebase needs to change.

### Contributing

Contributions are welcome! If you have suggestions, improvements, or bug fixes, feel free to submit a pull request or open an issue.

### License

This project is licensed under the MIT License - see the LICENSE file for details.
