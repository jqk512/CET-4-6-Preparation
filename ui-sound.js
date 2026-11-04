// Small synthesized cues avoid loading audio files and keep exam work silent.
let context;
let unlocked = false;
let charge;
const lastPlayed = new Map();
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
if (AudioContextClass) {
  try {
    context = new AudioContextClass();
    unlocked = context.state === "running";
  } catch {}
}

function allowed() {
  return !location.hash.startsWith("#/exam/") && !document.hidden;
}

function audio() {
  if (!AudioContextClass) return null;
  context ||= new AudioContextClass();
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

function unlock() {
  unlocked = true;
  audio();
}
document.addEventListener("pointerdown", unlock, {capture:true, passive:true});
document.addEventListener("keydown", unlock, {capture:true, passive:true});

function chirp(frequency, endFrequency, duration, volume, type = "sine", delay = 0) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.015);
}

export function playUiSound(kind, intensity = 1) {
  if (!allowed() || !unlocked) return;
  const now = performance.now();
  const minimum = {collision:105, carousel:60, click:65, support:250, release:100, switch:140, folder:140}[kind] || 70;
  if (now - (lastPlayed.get(kind) || -Infinity) < minimum) return;
  lastPlayed.set(kind, now);
  if (kind === "collision") {
    const power = Math.min(1, Math.max(0.25, intensity));
    chirp(165 + power * 35, 78, 0.105, 0.032 * power, "sine");
    chirp(310, 130, 0.065, 0.008 * power, "triangle");
  } else if (kind === "carousel") {
    chirp(740, 505, 0.075, 0.024, "triangle");
  } else if (kind === "switch") {
    chirp(365, 440, 0.115, 0.029, "sine");
    chirp(575, 520, 0.08, 0.015, "triangle", 0.035);
  } else if (kind === "folder") {
    chirp(285, 220, 0.13, 0.034, "triangle");
  } else if (kind === "support") {
    chirp(390, 620, 0.15, 0.042, "sine");
    chirp(625, 940, 0.2, 0.026, "sine", 0.055);
  } else if (kind === "release") {
    chirp(245, 780, 0.18, 0.048, "triangle");
    chirp(920, 630, 0.14, 0.022, "sine", 0.13);
  } else {
    chirp(545, 710, 0.09, 0.028, "sine");
  }
}

export function startCharge() {
  stopCharge(false);
  if (!allowed() || !unlocked) return;
  const ctx = audio();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 155;
  gain.gain.value = 0.0001;
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  charge = {oscillator, gain};
  updateCharge(0);
}

export function updateCharge(amount) {
  if (!charge || !allowed()) return;
  const level = Math.min(1, Math.max(0, amount));
  const at = context.currentTime;
  charge.oscillator.frequency.setTargetAtTime(155 + level * 390, at, 0.045);
  charge.gain.gain.setTargetAtTime(0.008 + level * 0.026, at, 0.04);
}

export function stopCharge(fire = false) {
  if (charge && context) {
    const {oscillator, gain} = charge;
    gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.025);
    try { oscillator.stop(context.currentTime + 0.12); } catch {}
    charge = undefined;
  }
  if (fire) playUiSound("release");
}
