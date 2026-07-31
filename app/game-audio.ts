"use client";

export type TacticalSound =
  | { type: "encounter" }
  | { type: "shot"; weapon: string; hit: boolean; head: boolean; turret?: boolean }
  | { type: "skill"; skillId: string; kind: string }
  | { type: "spike"; status: string }
  | { type: "kill"; count: number }
  | { type: "round"; winner: "attack" | "defense" }
  | { type: "turn"; side: "attack" | "defense" }
  | { type: "ui" };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.56;

const AudioContextConstructor = () => {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
};

function audioGraph() {
  if (!enabled) return null;
  if (!context) {
    const Constructor = AudioContextConstructor();
    if (!Constructor) return null;
    context = new Constructor();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 15;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.18;
    master = context.createGain();
    master.gain.value = volume;
    master.connect(compressor);
    compressor.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { context, master: master! };
}

export function configureTacticalAudio(nextEnabled: boolean, nextVolume: number) {
  enabled = nextEnabled;
  volume = Math.max(0, Math.min(1, nextVolume));
  if (master && context) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, 0.015);
}

export function unlockTacticalAudio() {
  audioGraph();
}

function envelope(node: GainNode, now: number, gain: number, duration: number, attack = 0.004) {
  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(0.0001, now);
  node.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, now + duration);
}

function tone(frequency: number, delay: number, duration: number, gain: number, wave: OscillatorType = "sine", endFrequency?: number) {
  const graph = audioGraph();
  if (!graph) return;
  const now = graph.context.currentTime + delay;
  const oscillator = graph.context.createOscillator();
  const amp = graph.context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(Math.max(25, frequency), now);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), now + duration);
  envelope(amp, now, gain, duration);
  oscillator.connect(amp);
  amp.connect(graph.master);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function noise(delay: number, duration: number, gain: number, filterType: BiquadFilterType, frequency: number) {
  const graph = audioGraph();
  if (!graph) return;
  const now = graph.context.currentTime + delay;
  const frames = Math.max(1, Math.floor(graph.context.sampleRate * duration));
  const buffer = graph.context.createBuffer(1, frames, graph.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
  const source = graph.context.createBufferSource();
  const filter = graph.context.createBiquadFilter();
  const amp = graph.context.createGain();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = 0.7;
  envelope(amp, now, gain, duration, 0.002);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(amp);
  amp.connect(graph.master);
  source.start(now);
}

function shotSound(weapon: string, turret = false) {
  if (turret) {
    tone(210, 0, 0.055, 0.2, "square", 110);
    tone(920, 0, 0.025, 0.08, "square", 520);
    return;
  }
  const shotgun = weapon === "bucky" || weapon === "judge";
  const sniper = weapon === "outlaw" || weapon === "operator";
  const revolver = weapon === "sheriff";
  const suppressed = weapon === "phantom" || weapon === "spectre";
  const weight = weapon === "operator" ? 1 : weapon === "outlaw" ? 0.82 : shotgun ? 0.72 : revolver ? 0.62 : 0.46;
  tone(sniper ? 64 : shotgun ? 82 : revolver ? 105 : 135, 0, sniper ? 0.22 : 0.12, 0.34 * weight, "sawtooth", 38);
  tone(sniper ? 760 : shotgun ? 540 : 980, 0.002, suppressed ? 0.045 : 0.075, 0.16 * weight, "square", 160);
  noise(0, sniper ? 0.2 : shotgun ? 0.16 : 0.085, (suppressed ? 0.15 : 0.25) * weight, suppressed ? "lowpass" : "highpass", suppressed ? 1250 : 900);
  if (weapon === "judge" || weapon === "spectre") noise(0.055, 0.045, 0.08, "bandpass", 1900);
}

function impactSound(hit: boolean, head: boolean) {
  if (!hit) {
    noise(0.045, 0.13, 0.08, "bandpass", 2600);
    tone(680, 0.05, 0.1, 0.035, "sine", 330);
    return;
  }
  if (head) {
    noise(0.035, 0.07, 0.12, "highpass", 2800);
    tone(1740, 0.035, 0.15, 0.14, "triangle", 980);
    tone(3120, 0.046, 0.09, 0.075, "sine", 1760);
    return;
  }
  tone(118, 0.04, 0.12, 0.18, "triangle", 58);
  noise(0.045, 0.08, 0.1, "lowpass", 720);
}

function encounterSound() {
  tone(190, 0, 0.12, 0.08, "sawtooth", 270);
  tone(380, 0.07, 0.15, 0.12, "square", 640);
  noise(0.04, 0.09, 0.04, "highpass", 2800);
}

function skillSound(skillId: string, kind: string) {
  const explosive = ["paint", "shock", "aftershock", "blast", "hot", "relay"].includes(skillId);
  const flash = ["curve", "flash"].includes(skillId);
  const scan = ["recon", "camera", "alarm", "trip"].includes(skillId) || kind === "scan";
  const smoke = ["smoke", "dark"].includes(skillId) || kind === "smoke";
  const movement = ["tailwind", "updraft", "gear", "shadow"].includes(skillId) || kind === "teleport";
  if (explosive) {
    tone(440, 0, 0.18, 0.08, "sine", 100);
    noise(0.09, 0.22, 0.18, "lowpass", 950);
    tone(72, 0.1, 0.24, 0.17, "sawtooth", 38);
  } else if (flash) {
    tone(780, 0, 0.08, 0.05, "sine", 1580);
    tone(2850, 0.065, 0.22, 0.12, "sine", 1760);
    noise(0.055, 0.11, 0.06, "highpass", 3200);
  } else if (scan) {
    tone(540, 0, 0.09, 0.08, "square", 820);
    tone(1120, 0.12, 0.12, 0.08, "sine", 1480);
    tone(1480, 0.28, 0.14, 0.06, "sine", 720);
  } else if (smoke) {
    noise(0, 0.42, 0.12, "lowpass", 620);
    tone(96, 0, 0.4, 0.12, "sine", 52);
  } else if (movement) {
    noise(0, 0.22, 0.1, "bandpass", 1400);
    tone(180, 0, 0.24, 0.08, "triangle", 920);
  } else {
    tone(330, 0, 0.13, 0.07, "triangle", 660);
    tone(660, 0.08, 0.12, 0.06, "sine", 440);
  }
}

function spikeSound(status: string) {
  if (status === "planting" || status === "defusing") {
    [0, 0.12, 0.24].forEach((delay, index) => tone(520 + index * 105, delay, 0.06, 0.08, "square"));
  } else if (status === "planted") {
    tone(420, 0, 0.1, 0.13, "square");
    tone(840, 0.13, 0.16, 0.14, "square");
  } else if (status === "half") {
    tone(610, 0, 0.12, 0.11, "triangle");
    tone(910, 0.14, 0.12, 0.1, "triangle");
  } else if (status === "defused") {
    [390, 520, 780, 1040].forEach((frequency, index) => tone(frequency, index * 0.09, 0.18, 0.1, "sine"));
  } else if (status === "exploded") {
    noise(0, 0.65, 0.38, "lowpass", 700);
    tone(52, 0, 0.72, 0.35, "sawtooth", 28);
    noise(0.16, 0.38, 0.14, "highpass", 2100);
  } else if (status === "dropped") {
    tone(260, 0, 0.13, 0.08, "square", 130);
  }
}

function killSound(count: number) {
  const capped = Math.min(5, Math.max(1, count));
  const base = 310 + capped * 80;
  tone(base, 0, 0.11, 0.12, "triangle", base * 1.45);
  tone(base * 1.5, 0.09, 0.18, 0.1, "sine", base * 2);
  if (capped >= 3) tone(base * 2.25, 0.19, 0.28, 0.12, "square", base * 1.7);
  if (capped === 5) [0, 0.08, 0.16].forEach((delay, index) => tone(980 + index * 260, 0.3 + delay, 0.28, 0.1, "sine"));
}

function roundSound(winner: "attack" | "defense") {
  const root = winner === "attack" ? 196 : 220;
  [1, 1.25, 1.5, 2].forEach((ratio, index) => tone(root * ratio, index * 0.12, 0.38, 0.1, index === 3 ? "square" : "triangle"));
  noise(0.02, 0.22, 0.05, "highpass", 2600);
}

export function playTacticalSound(event: TacticalSound) {
  if (!enabled) return;
  if (event.type === "encounter") encounterSound();
  else if (event.type === "shot") {
    shotSound(event.weapon, event.turret);
    impactSound(event.hit, event.head);
  } else if (event.type === "skill") skillSound(event.skillId, event.kind);
  else if (event.type === "spike") spikeSound(event.status);
  else if (event.type === "kill") killSound(event.count);
  else if (event.type === "round") roundSound(event.winner);
  else if (event.type === "turn") {
    tone(event.side === "attack" ? 260 : 220, 0, 0.09, 0.055, "square");
    tone(event.side === "attack" ? 390 : 330, 0.08, 0.12, 0.055, "triangle");
  } else {
    tone(720, 0, 0.045, 0.035, "square", 540);
  }
}
