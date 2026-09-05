# Protect the President

Protect the President is a browser game inspired by Hnefatafl (Viking chess), reworked into a street-level escort mission. Secret Service defenders (played by you) must get a president — selectable from a roster of satirical archetypes — up the block to a single waiting car, while AI-controlled protestors pour out of the buildings to stop them. The president itself doesn't take orders from anyone — it moves autonomously, with an AI "personality" that mirrors the tone of whichever president you picked.

### Gameplay Overview

- **Objective:** Clear every block in the campaign. Get the president to the exit at the far end of a level to advance to the next one (defenders win the level) or lose the president to the crowd and retry it (attackers win the level).
- **Campaign:** Five hand-tuned levels, each bigger and harder than the last — more doors, more starting protestors, faster spawn waves, and (from level 3 on) interior barricades that force a chokepoint. Beat all five and the campaign is complete.
- **Board:** A long street block. Buildings line both sides; a handful of doors in those buildings are where protestors spawn in from. There is exactly one exit, at the far end from where the motorcade starts.
- **Roles:**
  - **Defenders (you):** A fixed roster of Secret Service agents, sized to the level. Move one piece per turn. Once an agent is taken out, they're gone for the rest of that level — no reinforcements. A fresh level means a fresh full roster.
  - **Attackers (AI):** Protestors. Endless supply — every couple of rounds, new protestors spill out of any open building door, for as long as the game runs. A simple greedy AI prioritizes captures and otherwise closes the distance to the president.
  - **The President (AI, autonomous):** Not controlled by either side. Each round it decides on its own whether and where to move, biased by its selected personality (flee danger, wander erratically, walk boldly toward the crowd, or dig in and refuse to budge), with flavor-text quotes logged to the Situation Report panel.
- **Movement:** Orthogonal sliding moves (like a chess rook), blocked by walls and other pieces.
- **Capture:** Sandwich-capture — flank an enemy piece between two of your own, or between one of yours and a building wall, to remove it (pinning someone against the buildings works same as pinning them between two agents). The president is captured once every side is either a protestor or a wall.

### Front End

- **Title screen:** pick your president, jump into a new campaign, or continue a saved one.
- **Options:** sound effects on/off, music on/off, volume, clear the saved game — reachable from the title screen or mid-game via the in-game Menu button (which also offers Quit to Title).
- **Checkpoints:** the game saves a full snapshot of the board to `localStorage` every time it's safely your turn — not just on level clear. Close the tab mid-level and Continue picks up on the exact same position, pieces and all. Losing the president never touches the save — it just retries the current level from scratch, full roster restored.
- **Sound:** short SFX (move, capture, agent lost, protestor spawn, danger, level clear, game over, UI clicks) plus a quiet generative four-chord background loop, both synthesized live via the WebAudio API — no audio files to ship.
- **Touch:** the board is a tap target like any other — select a piece, tap a highlighted square to move it. The canvas scales to fit narrow screens while keeping click/tap coordinates accurate.

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
    board.ts         Level system: per-level configs, procedural layout generation (walls/doors/exit/starts)
    rules.ts         Move generation, capture resolution, protestor spawning, win conditions
    presidents.ts    Selectable president roster: personality + flavor text
    presidentAI.ts   Decides the president's autonomous move each round
    attackerAI.ts    Decides the protestor AI's move each round
  render.ts          Canvas rendering
  sound.ts           Synthesized SFX + generative background music (WebAudio, no asset files)
  save.ts            localStorage save data: checkpoint level, president, audio prefs, mid-level snapshot
  main.ts            App wiring: screens, DOM, input handling, turn loop
```

### The Campaign

`src/game/board.ts` exports `LEVELS`, an ordered array of `LevelConfig` objects — each one just a handful of tuning knobs (dimensions, which rows have doors, which rows have a barricade, defender/attacker counts, spawn rate). `buildLevel()` turns a config into a full playable layout deterministically (fixed defender formation, fixed zigzag attacker scatter — no randomness in the geometry itself, only in how the AI plays it). Add a level by appending another config to `LEVELS`; nothing else needs to change. The shipped campaign:

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
