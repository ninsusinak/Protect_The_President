# Protect the President

Protect the President is a browser game inspired by Hnefatafl (Viking chess). The king is replaced by a president, selectable from a roster of satirical archetypes. Secret Service defenders (played by you) must escort the president to one of the board's escape squares, while AI-controlled protestors try to surround and capture the president first. The president itself doesn't take orders from anyone — it moves autonomously, with an AI "personality" that mirrors the tone of whichever president you picked.

### Gameplay Overview

- **Objective:** Get the president to an escape square (defenders win) or surround the president with protestors (attackers win).
- **Board:** A 7x7 tafl-style board (the compact "Brandub" layout) with a central throne and four corner escape squares.
- **Roles:**
  - **Defenders (you):** Secret Service agents. Move one piece per turn.
  - **Attackers (AI):** Protestors. A simple greedy AI that prioritizes captures and otherwise closes the distance to the president.
  - **The President (AI, autonomous):** Not controlled by either side. Each round it decides on its own whether and where to move, biased by its selected personality (flee danger, wander erratically, walk boldly toward the crowd, or dig in and refuse to budge), with flavor-text quotes logged to the Situation Report panel.
- **Movement:** Orthogonal sliding moves (like a chess rook), same as classic tafl.
- **Capture:** Standard tafl sandwich-capture — flank an enemy piece between two of your own (or a hostile throne/corner square) to remove it. The president is captured only once surrounded on all four sides by protestors.

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
    board.ts         Board geometry (size, throne, corners)
    rules.ts         Move generation, capture resolution, win conditions
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
