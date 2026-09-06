import "./style.css";
import { CELL, boardPixelSize, renderBoard, type TargetHighlight } from "./render";
import { LEVELS, buildLevel, type Level } from "./game/board";
import { PRESIDENTS, pickLine, type PresidentProfile } from "./game/presidents";
import { runAttackerTurn, type CombatEvent } from "./game/attackerAI";
import { decidePresidentMove } from "./game/presidentAI";
import {
  attackableTargets,
  createInitialState,
  findPieceCoord,
  hasCover,
  performAttack,
  performMove,
  performOverwatch,
  piecesInRange,
  reachableTiles,
  refreshPresidentEscortBoost,
  resetAP,
  spawnAttackers,
  tickPresidentEscortBoost,
} from "./game/rules";
import { statsFor } from "./game/units";
import type { Coord, GameState, Piece } from "./game/types";
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
const unitInfoEl = document.getElementById("unit-info") as HTMLParagraphElement;
const escortStatusEl = document.getElementById("escort-status") as HTMLParagraphElement;
const overwatchBtn = document.getElementById("overwatch-btn") as HTMLButtonElement;
const endTurnBtn = document.getElementById("end-turn-btn") as HTMLButtonElement;
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
let selectedUnitId: number | null = null;
let reachableCache: Coord[] = [];
let targetsCache: TargetHighlight[] = [];
let targetPieces: Array<{ coord: Coord; piece: Piece }> = [];
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

overwatchBtn.addEventListener("click", () => {
  if (selectedUnitId === null || awaitingAI || state.phase !== "defender-phase" || state.winner) return;
  uiClick();
  const ok = performOverwatch(state, selectedUnitId);
  if (ok) log("An agent holds position on overwatch.");
  deselect();
  draw();
});

endTurnBtn.addEventListener("click", () => {
  if (awaitingAI || state.winner || state.phase !== "defender-phase") return;
  uiClick();
  deselect();
  draw();
  runAIPhases();
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
  setupNewState();
}

function resumeFromSnapshot(index: number, snapshot: GameState) {
  winSequenceToken++;
  levelIndex = index;
  level = buildLevel(LEVELS[levelIndex]);
  state = snapshot;
  setupNewState();
  log("Picking back up right where you left off.");
}

function setupNewState() {
  const px = boardPixelSize(state);
  canvas.width = px.width;
  canvas.height = px.height;

  deselect();

  levelHeadingEl.textContent = `Level ${levelIndex + 1} of ${LEVELS.length}: ${level.name}`;
  levelBriefingEl.textContent = level.briefing;
  activePresidentEl.textContent = `${profile.name} — ${profile.archetype}`;
  activePresidentTaglineEl.textContent = profile.tagline;

  logEl.innerHTML = "";
  for (const line of state.log) appendLogLine(line);

  draw();
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

function getPiece(id: number): { piece: Piece; coord: Coord } | null {
  const coord = findPieceCoord(state, id);
  if (!coord) return null;
  return { piece: state.board[coord.row][coord.col]!, coord };
}

function selectUnit(id: number) {
  const found = getPiece(id);
  if (!found) {
    deselect();
    return;
  }
  selectedUnitId = id;
  const { piece, coord } = found;
  reachableCache = piece.ap > 0 ? reachableTiles(state, coord, statsFor(piece.kind).moveRange) : [];
  const targets = piece.ap > 0 ? attackableTargets(state, piece, coord) : [];
  targetsCache = targets.map((t) => ({ coord: t.coord, accuracy: t.accuracy }));
  targetPieces = targets.map((t) => ({ coord: t.coord, piece: t.piece }));
}

function deselect() {
  selectedUnitId = null;
  reachableCache = [];
  targetsCache = [];
  targetPieces = [];
}

function draw() {
  renderBoard(ctx, state, { selected: selectedUnitId ? findPieceCoord(state, selectedUnitId) : null, reachableTiles: reachableCache, targets: targetsCache });
  updateStatus();
  updateUnitInfo();
  updateControls();
  updateEscortStatus();
  persistSnapshot();
}

function updateEscortStatus() {
  if (state.presidentEscortBoost > 0) {
    escortStatusEl.hidden = false;
    escortStatusEl.textContent = `🏃 Prioritizing escape for ${state.presidentEscortBoost} more round${state.presidentEscortBoost > 1 ? "s" : ""} — keep an agent close to hold it.`;
  } else {
    escortStatusEl.hidden = true;
  }
}

function updateUnitInfo() {
  const found = selectedUnitId !== null ? getPiece(selectedUnitId) : null;
  if (!found) {
    unitInfoEl.textContent = "Select a Secret Service agent to begin.";
    return;
  }
  const coverNote = hasCover(state, found.coord) ? ", in cover" : "";
  unitInfoEl.textContent = `Agent selected — ${found.piece.ap} AP left${coverNote}.`;
}

function updateControls() {
  const isFinal = levelIndex === LEVELS.length - 1;
  retryBtn.textContent = state.winner === "defenders" && isFinal ? "Play Again" : "Retry Level";
  menuBtn.disabled = awaitingAI;

  const canAct = state.phase === "defender-phase" && !awaitingAI && !state.winner;
  endTurnBtn.disabled = !canAct;

  const selected = selectedUnitId !== null ? getPiece(selectedUnitId) : null;
  overwatchBtn.disabled = !canAct || !selected || selected.piece.ap <= 0;
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
  statusEl.textContent =
    selectedUnitId !== null
      ? "Move to a highlighted tile, attack a ringed target, or hold on Overwatch."
      : "Select an agent to act, then End Turn when you're done.";
}

function handleCanvasClick(ev: MouseEvent) {
  if (currentScreen !== "game") return;
  if (state.winner || state.phase !== "defender-phase" || awaitingAI) return;

  const rect = canvas.getBoundingClientRect();
  const col = Math.floor(((ev.clientX - rect.left) / rect.width) * canvas.width / CELL);
  const row = Math.floor(((ev.clientY - rect.top) / rect.height) * canvas.height / CELL);
  const coord: Coord = { row, col };
  const piece = state.board[row]?.[col];

  if (selectedUnitId !== null) {
    const target = targetPieces.find((t) => t.coord.row === row && t.coord.col === col);
    if (target) {
      const result = performAttack(state, selectedUnitId, target.piece.id);
      if (result.attempted) {
        logCombatEvent({
          actorTeam: "defender",
          actorKind: "agent",
          action: "attack",
          hit: result.hit,
          targetKind: target.piece.kind,
          presidentCaptured: result.presidentCaptured,
        });
      }
      selectUnit(selectedUnitId);
      draw();
      return;
    }

    const canMoveHere = reachableCache.some((c) => c.row === row && c.col === col);
    if (canMoveHere) {
      const unitId = selectedUnitId;
      const result = performMove(state, unitId, coord);
      if (result.moved) {
        log("An agent repositions.");
        playSound("move");
        for (const shot of result.overwatchShots) {
          logCombatEvent({ actorTeam: "attacker", actorKind: "brawler", action: "reaction", hit: shot.hit });
        }
      }
      if (findPieceCoord(state, unitId)) {
        selectUnit(unitId);
      } else {
        deselect();
      }
      draw();
      return;
    }
  }

  if (piece && piece.team === "defender" && piece.kind === "agent" && piece.ap > 0) {
    if (selectedUnitId === piece.id) {
      deselect();
    } else {
      selectUnit(piece.id);
    }
  } else {
    deselect();
  }
  draw();
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

function runAIPhases() {
  awaitingAI = true;

  const wasEscortBoosted = state.presidentEscortBoost > 0;
  refreshPresidentEscortBoost(state);
  if (state.presidentEscortBoost > 0 && !wasEscortBoosted) {
    log(`${profile.name}: ${pickLine(profile.flavor.escorted)}`);
  }

  draw();

  setTimeout(() => {
    resetAP(state, ["president"]);
    state.phase = "president-phase";
    draw();

    runPresidentPhase();
    tickPresidentEscortBoost(state);

    if (state.winner) {
      awaitingAI = false;
      draw();
      handleWinner();
      return;
    }

    setTimeout(() => {
      resetAP(state, ["brawler", "chucker"]);
      state.phase = "attacker-phase";
      draw();

      const events = runAttackerTurn(state);
      for (const ev of events) logCombatEvent(ev);

      if (!state.winner) {
        const spawned = spawnAttackers(state);
        if (spawned.length > 0) {
          log(`More protestors spill out of a building${spawned.length > 1 ? "s" : ""} down the block.`);
          playSound("spawn");
        }
      }

      awaitingAI = false;
      if (state.winner) {
        draw();
        handleWinner();
        return;
      }

      resetAP(state, ["agent"]);
      state.phase = "defender-phase";
      draw();
    }, 500);
  }, 500);
}

function runPresidentPhase() {
  for (;;) {
    const piece = state.board[state.presidentPos.row][state.presidentPos.col];
    if (!piece || piece.kind !== "president" || piece.ap <= 0) break;

    const to = decidePresidentMove(state, profile);
    if (!to) {
      log(`${profile.name} holds position.`);
      break;
    }

    const result = performMove(state, piece.id, to);
    if (!result.moved) break;

    log(`${profile.name}: ${pickLine(profile.flavor.move)}`);
    playSound("move");

    if (result.eliminated) return;
    if (result.presidentEscaped) {
      log(`${profile.name}: ${pickLine(profile.flavor.escape)}`);
      return;
    }
  }

  const nearbyThreats = piecesInRange(state, state.presidentPos, 1, { team: "attacker" }).length;
  if (nearbyThreats >= 2) {
    log(`${profile.name}: ${pickLine(profile.flavor.danger)}`);
    playSound("danger");
  }
}

function logCombatEvent(ev: CombatEvent) {
  if (ev.action === "reaction") {
    if (ev.hit) {
      log("An agent on overwatch fires — direct hit.");
      playSound("capture");
    } else {
      log("An agent on overwatch fires and misses.");
      playSound("miss");
    }
    return;
  }

  const actor =
    ev.actorKind === "brawler"
      ? "A protestor with a bat"
      : ev.actorKind === "chucker"
        ? "A protestor"
        : "An agent";
  const verb =
    ev.actorKind === "chucker" ? "hurls a bottle at" : ev.actorKind === "brawler" ? "swings at" : "levels a taser at";
  const targetWord =
    ev.targetKind === "president" ? "the President" : ev.targetKind === "agent" ? "an agent" : "a protestor";

  if (ev.hit) {
    log(`${actor} ${verb} ${targetWord}${ev.presidentCaptured ? " — and grabs hold!" : " — connects."}`);
    if (!ev.presidentCaptured) {
      playSound(ev.actorTeam === "attacker" && ev.targetKind === "agent" ? "agentLost" : "capture");
    }
  } else {
    log(`${actor} ${verb} ${targetWord} — misses.`);
    playSound("miss");
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
