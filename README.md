# Protect the President

Protect the President is a browser game inspired by Hnefatafl (Viking chess), reworked into a street-level escort mission. Secret Service defenders (played by you) must get a president — selectable from a roster of satirical archetypes — up the block to a single waiting car, while AI-controlled protestors pour out of the buildings to stop them. The president itself doesn't take orders from anyone — it moves autonomously, with an AI "personality" that mirrors the tone of whichever president you picked.

### Gameplay Overview

- **Objective:** Get the president to the exit at the far end of the street (defenders win) or surround the president with protestors (attackers win).
- **Board:** A long 9x15 street block. Buildings line both sides; a handful of doors in those buildings are where protestors spawn in from. There is exactly one exit, at the far end from where the motorcade starts.
- **Roles:**
  - **Defenders (you):** A fixed roster of Secret Service agents. Move one piece per turn. Once an agent is taken out, they're gone for the rest of the game — no reinforcements.
  - **Attackers (AI):** Protestors. Endless supply — every couple of rounds, new protestors spill out of any open building door, for as long as the game runs. A simple greedy AI prioritizes captures and otherwise closes the distance to the president.
  - **The President (AI, autonomous):** Not controlled by either side. Each round it decides on its own whether and where to move, biased by its selected personality (flee danger, wander erratically, walk boldly toward the crowd, or dig in and refuse to budge), with flavor-text quotes logged to the Situation Report panel.
- **Movement:** Orthogonal sliding moves (like a chess rook), blocked by walls and other pieces.
- **Capture:** Sandwich-capture — flank an enemy piece between two of your own, or between one of yours and a building wall, to remove it (pinning someone against the buildings works same as pinning them between two agents). The president is captured once every side is either a protestor or a wall.

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
    board.ts         Street layout: dimensions, walls/doors, exit, starting positions
    rules.ts         Move generation, capture resolution, protestor spawning, win conditions
    presidents.ts    Selectable president roster: personality + flavor text
    presidentAI.ts   Decides the president's autonomous move each round
    attackerAI.ts    Decides the protestor AI's move each round
  render.ts          Canvas rendering
  main.ts            App wiring: DOM, input handling, turn loop
```

`src/game/presidents.ts` is a plain data file — the shipped roster is a set of fictional archetypes (`The Showman`, `The Statesman`, `The Wildcard`, `The Isolationist`) so the satire targets a *type* of politician rather than a specific real person. Swap in real historical presidents there if you want a more pointed roster; nothing else in the codebase needs to change.

### Contributing

Contributions are welcome! If you have suggestions, improvements, or bug fixes, feel free to submit a pull request or open an issue.

### License

This project is licensed under the MIT License - see the LICENSE file for details.
