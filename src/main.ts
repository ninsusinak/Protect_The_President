import "./style.css";
import { CELL, boardPixelSize, renderBoard } from "./render";
import { LEVELS, buildLevel, type Level } from "./game/board";
import { PRESIDENTS, pickLine, type PresidentProfile } from "./game/presidents";
import { decideAttackerMove } from "./game/attackerAI";
import { decidePresidentMove } from "./game/presidentAI";
import {
  adjacentAttackerCount,
  allLegalMoves,
  applyMove,
  createInitialState,
  legalMovesFrom,
  spawnAttackers,
} from "./game/rules";
import type { Coord, GameState } from "./game/types";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const presidentSelect = document.getElementById("president-select") as HTMLSelectElement;
const presidentTagline = document.getElementById("president-tagline") as HTMLParagraphElement;
const newGameButton = document.getElementById("new-game") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLHeadingElement;
const logEl = document.getElementById("log") as HTMLUListElement;
const levelHeadingEl = document.getElementById("level-heading") as HTMLParagraphElement;
const levelBriefingEl = document.getElementById("level-briefing") as HTMLParagraphElement;

let levelIndex = 0;
let level: Level = buildLevel(LEVELS[levelIndex]);
let state: GameState = createInitialState(level);
let profile: PresidentProfile = PRESIDENTS[0];
let selected: Coord | null = null;
let legalTargets: Coord[] = [];
let awaitingAI = false;
let winSequenceToken = 0;

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
  startCampaign();
});

newGameButton.addEventListener("click", () => {
  const isFinal = levelIndex === LEVELS.length - 1;
  if (state.winner === "defenders" && isFinal) {
    startCampaign();
  } else {
    startLevel(levelIndex);
  }
});
canvas.addEventListener("click", handleCanvasClick);

function startCampaign() {
  startLevel(0);
  log(`${profile.name} takes the stage. ${profile.tagline}`);
}

function startLevel(index: number) {
  winSequenceToken++;
  levelIndex = index;
  level = buildLevel(LEVELS[levelIndex]);
  state = createInitialState(level);

  const px = boardPixelSize(state);
  canvas.width = px.width;
  canvas.height = px.height;

  selected = null;
  legalTargets = [];
  awaitingAI = false;

  levelHeadingEl.textContent = `Level ${levelIndex + 1} of ${LEVELS.length}: ${level.name}`;
  levelBriefingEl.textContent = level.briefing;

  logEl.innerHTML = "";
  for (const line of state.log) appendLogLine(line);

  draw();
  maybeAutoAdvance();
}

function appendLogLine(message: string) {
  const li = document.createElement("li");
  li.textContent = message;
  logEl.appendChild(li);
  logEl.scrollTop = logEl.scrollHeight;
}

function log(message: string) {
  state.log.push(message);
  appendLogLine(message);
}

function draw() {
  renderBoard(ctx, state, { selected, legalTargets });
  updateStatus();
  updateControls();
}

function updateControls() {
  const isFinal = levelIndex === LEVELS.length - 1;
  newGameButton.textContent = state.winner === "defenders" && isFinal ? "Play Again" : "Retry Level";
}

function updateStatus() {
  if (state.winner === "defenders") {
    const isFinal = levelIndex === LEVELS.length - 1;
    statusEl.textContent = isFinal
      ? "🎉 Every block cleared — the President is away safe. You win!"
      : "The President reaches the car. Block clear!";
    return;
  }
  if (state.winner === "attackers") {
    statusEl.textContent = "The President has been overwhelmed. Retry the level.";
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
      handleWinner();
      return;
    }
    state.phase = "attacker-phase";
    draw();

    setTimeout(() => {
      runAttackerPhase();
      awaitingAI = false;
      if (state.winner) {
        draw();
        handleWinner();
        return;
      }
      state.phase = "defender-phase";
      draw();
      maybeAutoAdvance();
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
  if (move) {
    const result = applyMove(state, move);
    if (result.captured.length > 0) {
      log("A Secret Service agent is overwhelmed and pulled from the line.");
    } else {
      log("The crowd surges forward.");
    }
    if (result.presidentCaptured) {
      log(`${profile.name}: ${pickLine(profile.flavor.captured)}`);
      return;
    }
  } else {
    log("The crowd presses in, boxed in for the moment.");
  }

  const spawned = spawnAttackers(state);
  if (spawned.length > 0) {
    log(`More protestors spill out of a building${spawned.length > 1 ? "s" : ""} down the block.`);
  }
}

function handleWinner() {
  if (state.winner !== "defenders") return;

  const isFinal = levelIndex === LEVELS.length - 1;
  if (isFinal) {
    log(`${profile.name} reaches the car. Motorcade clear across every block — campaign complete!`);
    return;
  }

  log(`${profile.name} reaches the car safely. Block clear.`);
  const token = ++winSequenceToken;
  setTimeout(() => {
    if (token !== winSequenceToken) return;
    levelIndex += 1;
    startLevel(levelIndex);
  }, 1800);
}

startCampaign();
