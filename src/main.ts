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
import {
  getVolume,
  initAudio,
  isMusicEnabled,
  isSoundEnabled,
  playSound,
  setMusicEnabled,
  setSoundEnabled,
  setVolume,
  startMusic,
  stopMusic,
} from "./sound";
import { clearSave, loadSave, saveProgress } from "./save";

const titleScreenEl = document.getElementById("title-screen") as HTMLDivElement;
const optionsScreenEl = document.getElementById("options-screen") as HTMLDivElement;
const gameScreenEl = document.getElementById("game-screen") as HTMLDivElement;

const titlePresidentSelect = document.getElementById("title-president-select") as HTMLSelectElement;
const titlePresidentTagline = document.getElementById("title-president-tagline") as HTMLParagraphElement;
const continueInfoEl = document.getElementById("continue-info") as HTMLParagraphElement;
const continueBtn = document.getElementById("continue-btn") as HTMLButtonElement;
const newGameBtn = document.getElementById("new-game-btn") as HTMLButtonElement;
const titleOptionsBtn = document.getElementById("title-options-btn") as HTMLButtonElement;

const soundToggle = document.getElementById("sound-toggle") as HTMLInputElement;
const musicToggle = document.getElementById("music-toggle") as HTMLInputElement;
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement;
const clearSaveBtn = document.getElementById("clear-save-btn") as HTMLButtonElement;
const quitToTitleBtn = document.getElementById("quit-to-title-btn") as HTMLButtonElement;
const optionsBackBtn = document.getElementById("options-back-btn") as HTMLButtonElement;

const menuBtn = document.getElementById("menu-btn") as HTMLButtonElement;
const activePresidentEl = document.getElementById("active-president") as HTMLParagraphElement;
const activePresidentTaglineEl = document.getElementById("active-president-tagline") as HTMLParagraphElement;
const retryBtn = document.getElementById("retry-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLHeadingElement;
const logEl = document.getElementById("log") as HTMLUListElement;
const levelHeadingEl = document.getElementById("level-heading") as HTMLParagraphElement;
const levelBriefingEl = document.getElementById("level-briefing") as HTMLParagraphElement;
const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

type Screen = "title" | "options" | "game";
let currentScreen: Screen = "title";
let screenBeforeOptions: Screen = "title";

let levelIndex = 0;
let level: Level = buildLevel(LEVELS[levelIndex]);
let state: GameState = createInitialState(level);
let profile: PresidentProfile = PRESIDENTS[0];
let selected: Coord | null = null;
let legalTargets: Coord[] = [];
let awaitingAI = false;
let winSequenceToken = 0;

// ---- Screen management ----

function showScreen(screen: Screen) {
  currentScreen = screen;
  titleScreenEl.hidden = screen !== "title";
  optionsScreenEl.hidden = screen !== "options";
  gameScreenEl.hidden = screen !== "game";
}

function openOptions(from: Screen) {
  screenBeforeOptions = from;
  quitToTitleBtn.hidden = from !== "game";
  showScreen("options");
}

function refreshContinueUI() {
  const save = loadSave();
  if (save) {
    const lvl = LEVELS[Math.min(save.levelIndex, LEVELS.length - 1)];
    continueBtn.hidden = false;
    continueInfoEl.hidden = false;
    continueInfoEl.textContent = `Saved: Level ${save.levelIndex + 1} of ${LEVELS.length} — ${lvl.name}`;
  } else {
    continueBtn.hidden = true;
    continueInfoEl.hidden = true;
  }
}

function uiClick() {
  initAudio();
  playSound("click");
}

// ---- Title screen setup ----

for (const p of PRESIDENTS) {
  const opt = document.createElement("option");
  opt.value = p.id;
  opt.textContent = `${p.name} — ${p.archetype}`;
  titlePresidentSelect.appendChild(opt);
}

const initialSave = loadSave();
profile = PRESIDENTS.find((p) => p.id === initialSave?.presidentId) ?? PRESIDENTS[0];
titlePresidentSelect.value = profile.id;
titlePresidentTagline.textContent = profile.tagline;
if (initialSave) {
  setSoundEnabled(initialSave.soundEnabled);
  setVolume(initialSave.volume);
  setMusicEnabled(initialSave.musicEnabled);
}
soundToggle.checked = isSoundEnabled();
musicToggle.checked = isMusicEnabled();
volumeSlider.value = String(Math.round(getVolume() * 100));
refreshContinueUI();

titlePresidentSelect.addEventListener("change", () => {
  profile = PRESIDENTS.find((p) => p.id === titlePresidentSelect.value) ?? PRESIDENTS[0];
  titlePresidentTagline.textContent = profile.tagline;
});

newGameBtn.addEventListener("click", () => {
  uiClick();
  startCampaignAt(0);
  showScreen("game");
  startMusic();
});

continueBtn.addEventListener("click", () => {
  uiClick();
  const save = loadSave();
  const startIndex = save ? Math.min(save.levelIndex, LEVELS.length - 1) : 0;
  if (save?.snapshot) {
    resumeFromSnapshot(startIndex, save.snapshot);
  } else {
    startCampaignAt(startIndex);
  }
  showScreen("game");
  startMusic();
});

titleOptionsBtn.addEventListener("click", () => {
  uiClick();
  openOptions("title");
});

// ---- Options screen ----

soundToggle.addEventListener("change", () => {
  setSoundEnabled(soundToggle.checked);
  saveProgress({ soundEnabled: soundToggle.checked });
  if (soundToggle.checked) uiClick();
});

musicToggle.addEventListener("change", () => {
  initAudio();
  setMusicEnabled(musicToggle.checked);
  saveProgress({ musicEnabled: musicToggle.checked });
  if (musicToggle.checked) uiClick();
});

volumeSlider.addEventListener("input", () => {
  setVolume(Number(volumeSlider.value) / 100);
});

volumeSlider.addEventListener("change", () => {
  saveProgress({ volume: getVolume() });
  uiClick();
});

clearSaveBtn.addEventListener("click", () => {
  uiClick();
  clearSave();
  refreshContinueUI();
});

quitToTitleBtn.addEventListener("click", () => {
  uiClick();
  stopMusic();
  refreshContinueUI();
  showScreen("title");
});

optionsBackBtn.addEventListener("click", () => {
  uiClick();
  showScreen(screenBeforeOptions);
});

// ---- In-game controls ----

menuBtn.addEventListener("click", () => {
  if (awaitingAI) return;
  uiClick();
  openOptions("game");
});

retryBtn.addEventListener("click", () => {
  uiClick();
  const isFinal = levelIndex === LEVELS.length - 1;
  if (state.winner === "defenders" && isFinal) {
    startCampaignAt(0);
  } else {
    startLevel(levelIndex);
  }
});

canvas.addEventListener("click", handleCanvasClick);

// ---- Game flow ----

function startCampaignAt(index: number) {
  startLevel(index);
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
  activePresidentEl.textContent = `${profile.name} — ${profile.archetype}`;
  activePresidentTaglineEl.textContent = profile.tagline;

  logEl.innerHTML = "";
  for (const line of state.log) appendLogLine(line);

  draw();
  maybeAutoAdvance();
}

// Restores a mid-level board exactly as saved, rather than rebuilding the
// level from scratch — used by Continue when a snapshot is available.
function resumeFromSnapshot(index: number, snapshot: GameState) {
  winSequenceToken++;
  levelIndex = index;
  level = buildLevel(LEVELS[levelIndex]);
  state = snapshot;

  const px = boardPixelSize(state);
  canvas.width = px.width;
  canvas.height = px.height;

  selected = null;
  legalTargets = [];
  awaitingAI = false;

  levelHeadingEl.textContent = `Level ${levelIndex + 1} of ${LEVELS.length}: ${level.name}`;
  levelBriefingEl.textContent = level.briefing;
  activePresidentEl.textContent = `${profile.name} — ${profile.archetype}`;
  activePresidentTaglineEl.textContent = profile.tagline;

  logEl.innerHTML = "";
  for (const line of state.log) appendLogLine(line);
  log("Picking back up right where you left off.");

  draw();
  maybeAutoAdvance();
}

// Checkpoints the exact board position whenever it's safe to resume from
// (the player's turn, nothing mid-air). A loss clears the snapshot instead —
// there's nothing useful to resume into once the level is over.
function persistSnapshot() {
  if (currentScreen !== "game") return;
  if (state.winner) {
    saveProgress({ snapshot: null });
    return;
  }
  if (state.phase !== "defender-phase") return;
  saveProgress({ levelIndex, presidentId: profile.id, snapshot: state });
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
  persistSnapshot();
}

function updateControls() {
  const isFinal = levelIndex === LEVELS.length - 1;
  retryBtn.textContent = state.winner === "defenders" && isFinal ? "Play Again" : "Retry Level";
  menuBtn.disabled = awaitingAI;
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
  if (currentScreen !== "game") return;
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
      playSound("capture");
    } else {
      log("An agent repositions.");
      playSound("move");
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
    playSound(result.captured.length > 0 ? "capture" : "move");
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
    playSound("danger");
  }
}

function runAttackerPhase() {
  const move = decideAttackerMove(state);
  if (move) {
    const result = applyMove(state, move);
    if (result.captured.length > 0) {
      log("A Secret Service agent is overwhelmed and pulled from the line.");
      playSound("agentLost");
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
    playSound("spawn");
  }
}

function handleWinner() {
  if (state.winner === "attackers") {
    playSound("gameOver");
    return;
  }
  if (state.winner !== "defenders") return;

  playSound("levelClear");
  const isFinal = levelIndex === LEVELS.length - 1;

  if (isFinal) {
    saveProgress({ levelIndex, presidentId: profile.id });
    log(`${profile.name} reaches the car. Motorcade clear across every block — campaign complete!`);
    return;
  }

  log(`${profile.name} reaches the car safely. Block clear.`);
  const nextIndex = levelIndex + 1;
  saveProgress({ levelIndex: nextIndex, presidentId: profile.id });
  const token = ++winSequenceToken;
  setTimeout(() => {
    if (token !== winSequenceToken) return;
    startLevel(nextIndex);
  }, 1800);
}
