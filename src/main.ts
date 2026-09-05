import "./style.css";
import { CELL, renderBoard } from "./render";
import { PRESIDENTS, pickLine, type PresidentProfile } from "./game/presidents";
import { decideAttackerMove } from "./game/attackerAI";
import { decidePresidentMove } from "./game/presidentAI";
import {
  adjacentAttackerCount,
  allLegalMoves,
  applyMove,
  createInitialState,
  legalMovesFrom,
} from "./game/rules";
import type { Coord, GameState } from "./game/types";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const presidentSelect = document.getElementById("president-select") as HTMLSelectElement;
const presidentTagline = document.getElementById("president-tagline") as HTMLParagraphElement;
const newGameButton = document.getElementById("new-game") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLHeadingElement;
const logEl = document.getElementById("log") as HTMLUListElement;

let state: GameState;
let profile: PresidentProfile = PRESIDENTS[0];
let selected: Coord | null = null;
let legalTargets: Coord[] = [];
let awaitingAI = false;

for (const p of PRESIDENTS) {
  const opt = document.createElement("option");
  opt.value = p.id;
  opt.textContent = `${p.name} — ${p.archetype}`;
  presidentSelect.appendChild(opt);
}
presidentSelect.value = profile.id;
presidentTagline.textContent = profile.tagline;

presidentSelect.addEventListener("change", () => {
  profile = PRESIDENTS.find((p) => p.id === presidentSelect.value) ?? PRESIDENTS[0];
  presidentTagline.textContent = profile.tagline;
  newGame();
});

newGameButton.addEventListener("click", newGame);
canvas.addEventListener("click", handleCanvasClick);

function newGame() {
  state = createInitialState();
  selected = null;
  legalTargets = [];
  awaitingAI = false;
  log(`${profile.name} takes the stage. ${profile.tagline}`);
  draw();
  maybeAutoAdvance();
}

function log(message: string) {
  state.log.push(message);
  const li = document.createElement("li");
  li.textContent = message;
  logEl.appendChild(li);
  logEl.scrollTop = logEl.scrollHeight;
}

function draw() {
  renderBoard(ctx, state, { selected, legalTargets });
  updateStatus();
}

function updateStatus() {
  if (state.winner === "defenders") {
    statusEl.textContent = "The President escaped safely. Secret Service wins.";
    return;
  }
  if (state.winner === "attackers") {
    statusEl.textContent = "The President has been overwhelmed. Protestors win.";
    return;
  }
  if (state.phase !== "defender-phase" || awaitingAI) {
    statusEl.textContent = "Standby, situation developing...";
    return;
  }
  statusEl.textContent = selected
    ? "Choose a destination for the selected agent."
    : "Your move: choose a Secret Service agent.";
}

function defenderHasPlayableMoves(): boolean {
  return allLegalMoves(state, "defender").some((m) => {
    const piece = state.board[m.from.row][m.from.col];
    return piece && !piece.isPresident;
  });
}

function handleCanvasClick(ev: MouseEvent) {
  if (state.winner || state.phase !== "defender-phase" || awaitingAI) return;

  const rect = canvas.getBoundingClientRect();
  const col = Math.floor(((ev.clientX - rect.left) / rect.width) * canvas.width / CELL);
  const row = Math.floor(((ev.clientY - rect.top) / rect.height) * canvas.height / CELL);
  const coord: Coord = { row, col };
  const piece = state.board[row]?.[col];

  if (!selected) {
    if (piece && piece.team === "defender" && !piece.isPresident) {
      selected = coord;
      legalTargets = legalMovesFrom(state, coord);
    }
    draw();
    return;
  }

  if (selected.row === coord.row && selected.col === coord.col) {
    selected = null;
    legalTargets = [];
    draw();
    return;
  }

  const isTarget = legalTargets.some((t) => t.row === row && t.col === col);
  if (isTarget) {
    const result = applyMove(state, { from: selected, to: coord });
    if (result.captured.length > 0) {
      log(`Secret Service pins down ${result.captured.length} protestor${result.captured.length > 1 ? "s" : ""}.`);
    } else {
      log("An agent repositions.");
    }
    selected = null;
    legalTargets = [];
    state.phase = "president-phase";
    draw();
    if (!state.winner) runAIPhases();
    return;
  }

  if (piece && piece.team === "defender" && !piece.isPresident) {
    selected = coord;
    legalTargets = legalMovesFrom(state, coord);
    draw();
    return;
  }

  selected = null;
  legalTargets = [];
  draw();
}

function maybeAutoAdvance() {
  if (state.winner) return;
  if (state.phase === "defender-phase" && !defenderHasPlayableMoves()) {
    log("No Secret Service agent can move — the President is on their own this round.");
    state.phase = "president-phase";
    runAIPhases();
  }
}

function runAIPhases() {
  awaitingAI = true;
  draw();

  setTimeout(() => {
    runPresidentPhase();
    if (state.winner) {
      awaitingAI = false;
      draw();
      return;
    }
    state.phase = "attacker-phase";
    draw();

    setTimeout(() => {
      runAttackerPhase();
      awaitingAI = false;
      if (!state.winner) {
        state.phase = "defender-phase";
      }
      draw();
      if (!state.winner) maybeAutoAdvance();
    }, 500);
  }, 500);
}

function runPresidentPhase() {
  const from = state.presidentPos;
  const to = decidePresidentMove(state, profile);

  if (!to) {
    log(`${profile.name} holds position.`);
  } else {
    const result = applyMove(state, { from, to });
    log(`${profile.name}: ${pickLine(profile.flavor.move)}`);
    if (result.captured.length > 0) {
      log(`The President's move traps ${result.captured.length} protestor${result.captured.length > 1 ? "s" : ""}!`);
    }
    if (result.presidentEscaped) {
      log(`${profile.name}: ${pickLine(profile.flavor.escape)}`);
      return;
    }
  }

  if (adjacentAttackerCount(state, state.presidentPos) >= 2) {
    log(`${profile.name}: ${pickLine(profile.flavor.danger)}`);
  }
}

function runAttackerPhase() {
  const move = decideAttackerMove(state);
  if (!move) {
    log("The protestors are boxed in with nowhere to go. Secret Service wins.");
    state.winner = "defenders";
    return;
  }

  const result = applyMove(state, move);
  if (result.captured.length > 0) {
    log(`A Secret Service agent is overwhelmed and pulled from the line.`);
  } else {
    log("The crowd surges forward.");
  }

  if (result.presidentCaptured) {
    log(`${profile.name}: ${pickLine(profile.flavor.captured)}`);
  }
}

newGame();
