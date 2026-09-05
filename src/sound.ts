// Lightweight synthesized SFX via WebAudio — no asset files to ship or load.
export type SoundName =
  | "move"
  | "capture"
  | "agentLost"
  | "spawn"
  | "danger"
  | "levelClear"
  | "gameOver"
  | "click";

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.5;

// AudioContext must be created/resumed from a real user gesture (a button
// click qualifies) — browsers block audio otherwise.
export function initAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}

export function getVolume(): number {
  return volume;
}

function tone(freq: number, duration: number, type: OscillatorType, gainLevel: number, glideTo?: number) {
  if (!enabled || !ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (glideTo !== undefined) osc.frequency.linearRampToValueAtTime(glideTo, now + duration);
  gain.gain.setValueAtTime(gainLevel * volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function noiseBurst(duration: number, gainLevel: number) {
  if (!enabled || !ctx) return;
  const now = ctx.currentTime;
  const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainLevel * volume, now);
  src.connect(gain).connect(ctx.destination);
  src.start(now);
}

export function playSound(name: SoundName) {
  if (!enabled || !ctx) return;
  switch (name) {
    case "move":
      tone(440, 0.07, "sine", 0.15);
      break;
    case "capture":
      noiseBurst(0.12, 0.22);
      tone(180, 0.15, "square", 0.18);
      break;
    case "agentLost":
      tone(220, 0.35, "sawtooth", 0.2, 90);
      break;
    case "spawn":
      tone(130, 0.14, "triangle", 0.18, 95);
      break;
    case "danger":
      tone(660, 0.09, "square", 0.14);
      setTimeout(() => tone(660, 0.09, "square", 0.14), 130);
      break;
    case "levelClear":
      [523, 659, 784, 1047].forEach((freq, i) => setTimeout(() => tone(freq, 0.16, "sine", 0.2), i * 100));
      break;
    case "gameOver":
      tone(300, 0.5, "sawtooth", 0.22, 70);
      break;
    case "click":
      tone(880, 0.045, "sine", 0.1);
      break;
  }
}
