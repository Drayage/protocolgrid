"use client";

export type TacticalAudioProfile = "headset" | "speakers";

export type TacticalSound = (
  | { type: "encounter" }
  | { type: "shot"; weapon: string; hit: boolean; head: boolean; turret?: boolean }
  | { type: "skill"; skillId: string; kind: string }
  | { type: "spike"; status: string }
  | { type: "kill"; count: number }
  | { type: "round"; winner: "attack" | "defense" }
  | { type: "turn"; side: "attack" | "defense" }
  | { type: "ui" }
) & { pan?: number };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let mixFilter: BiquadFilterNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let enabled = true;
let volume = 0.5;
let outputProfile: TacticalAudioProfile = "headset";
let eventPan = 0;

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
    compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 15;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.18;
    master = context.createGain();
    mixFilter = context.createBiquadFilter();
    mixFilter.type = "peaking";
    master.gain.value = volume;
    master.connect(mixFilter);
    mixFilter.connect(compressor);
    compressor.connect(context.destination);
    applyOutputProfile();
  }
  if (context.state === "suspended") void context.resume();
  return { context, master: master! };
}

function applyOutputProfile() {
  if (!mixFilter || !compressor || !context) return;
  const now = context.currentTime;
  mixFilter.frequency.setTargetAtTime(outputProfile === "headset" ? 2200 : 1550, now, 0.02);
  mixFilter.Q.setTargetAtTime(outputProfile === "headset" ? 0.72 : 0.58, now, 0.02);
  mixFilter.gain.setTargetAtTime(outputProfile === "headset" ? 1.8 : 2.7, now, 0.02);
  compressor.threshold.setTargetAtTime(outputProfile === "headset" ? -19 : -23, now, 0.02);
  compressor.ratio.setTargetAtTime(outputProfile === "headset" ? 7 : 10, now, 0.02);
}

export function configureTacticalAudio(nextEnabled: boolean, nextVolume: number, nextProfile: TacticalAudioProfile = outputProfile) {
  enabled = nextEnabled;
  volume = Math.max(0, Math.min(1, nextVolume));
  outputProfile = nextProfile;
  applyOutputProfile();
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

function connectSignal(node: AudioNode, graph: { context: AudioContext; master: GainNode }) {
  if (typeof graph.context.createStereoPanner !== "function") {
    node.connect(graph.master);
    return;
  }
  const panner = graph.context.createStereoPanner();
  const width = outputProfile === "headset" ? 0.78 : 0.38;
  panner.pan.value = Math.max(-1, Math.min(1, eventPan)) * width;
  node.connect(panner);
  panner.connect(graph.master);
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
  connectSignal(amp, graph);
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
  connectSignal(amp, graph);
  source.start(now);
}

function noiseSweep(delay: number, duration: number, gain: number, filterType: BiquadFilterType, startFrequency: number, endFrequency: number, q = 0.7) {
  const graph = audioGraph();
  if (!graph) return;
  const now = graph.context.currentTime + delay;
  const frames = Math.max(1, Math.floor(graph.context.sampleRate * duration));
  const buffer = graph.context.createBuffer(1, frames, graph.context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < frames; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.62 + white * 0.38;
    data[index] = previous;
  }
  const source = graph.context.createBufferSource();
  const filter = graph.context.createBiquadFilter();
  const amp = graph.context.createGain();
  filter.type = filterType;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(Math.max(25, startFrequency), now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), now + duration);
  envelope(amp, now, gain, duration, 0.006);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(amp);
  connectSignal(amp, graph);
  source.start(now);
}

function mechanicalClick(delay: number, gain: number, metal = 2600) {
  noise(delay, 0.012, gain, "highpass", metal);
  noise(delay + 0.006, 0.024, gain * 0.42, "bandpass", metal * 0.56);
}

function pressureBlast(delay: number, gain: number, body = 640, tail = 0.18) {
  noise(delay, 0.018, gain * 0.9, "highpass", 2400);
  noise(delay + 0.002, tail, gain, "lowpass", body);
  tone(Math.max(34, body * 0.09), delay, tail * 1.08, gain * 0.26, "sawtooth", 27);
}

function electricArc(delay: number, gain: number, duration = 0.16) {
  [0, 0.035, 0.083].forEach((offset, index) => noise(delay + offset, 0.012 + index * 0.004, gain * (1 - index * 0.16), "highpass", 3900 - index * 360));
  noiseSweep(delay, duration, gain * 0.48, "bandpass", 3200, 920, 2.2);
}

function servoMotion(delay: number, gain: number, duration = 0.2) {
  noiseSweep(delay, duration, gain, "bandpass", 410, 1750, 4.2);
  mechanicalClick(delay + duration, gain * 0.78, 3400);
}

interface WeaponVoice {
  air: number;
  body: number;
  sub: number;
  tail: number;
  metal: number;
  weight: number;
  suppressed?: boolean;
  shotgun?: boolean;
  sniper?: boolean;
}

const WEAPON_VOICES: Record<string, WeaponVoice> = {
  classic: { air: 3650, body: 1280, sub: 104, tail: 0.07, metal: 3250, weight: 0.46 },
  sheriff: { air: 2850, body: 930, sub: 72, tail: 0.13, metal: 2950, weight: 0.76 },
  bucky: { air: 2140, body: 560, sub: 58, tail: 0.19, metal: 2350, weight: 0.86, shotgun: true },
  spectre: { air: 4300, body: 1520, sub: 112, tail: 0.058, metal: 3650, weight: 0.48, suppressed: true },
  bulldog: { air: 3240, body: 980, sub: 84, tail: 0.09, metal: 3140, weight: 0.62 },
  outlaw: { air: 2480, body: 650, sub: 54, tail: 0.27, metal: 2720, weight: 0.9, sniper: true },
  judge: { air: 2520, body: 690, sub: 64, tail: 0.14, metal: 3300, weight: 0.8, shotgun: true },
  phantom: { air: 4080, body: 1360, sub: 96, tail: 0.072, metal: 3520, weight: 0.56, suppressed: true },
  vandal: { air: 3050, body: 820, sub: 72, tail: 0.115, metal: 3020, weight: 0.72 },
  operator: { air: 1980, body: 470, sub: 42, tail: 0.42, metal: 2450, weight: 1, sniper: true },
};

function shotSound(weapon: string, turret = false) {
  if (turret) {
    servoMotion(0, 0.055, 0.055);
    [0.072, 0.128, 0.184].forEach((delay, index) => {
      noise(delay, 0.016, 0.15 - index * 0.018, "highpass", 3150);
      noise(delay, 0.055, 0.07, "bandpass", 1120);
    });
    return;
  }
  const voice = WEAPON_VOICES[weapon] ?? WEAPON_VOICES.classic;
  const muzzleGain = 0.3 * voice.weight;

  // Each gun keeps a learnable three-beat identity: muzzle crack, pressure
  // body, then its own action/bolt. Noise carries the blast; pitch is only sub pressure.
  noise(0, 0.016, muzzleGain, "highpass", voice.air);
  noise(0.002, voice.tail, (voice.suppressed ? 0.13 : 0.24) * voice.weight, voice.suppressed ? "bandpass" : "lowpass", voice.body);
  tone(voice.sub, 0, voice.tail * 1.12, 0.11 * voice.weight, "sawtooth", Math.max(27, voice.sub * 0.48));

  if (voice.suppressed) {
    noiseSweep(0.012, voice.tail * 1.4, 0.052 * voice.weight, "bandpass", voice.air, 920, 1.4);
    mechanicalClick(voice.tail * 0.7, 0.035, voice.metal);
  } else mechanicalClick(0.028, 0.044 * voice.weight, voice.metal);

  if (voice.shotgun) {
    [0.014, 0.028, 0.046].forEach((delay, index) => noise(delay, 0.06 + index * 0.018, 0.052 - index * 0.009, "bandpass", 1320 - index * 210));
    if (weapon === "bucky") {
      servoMotion(0.18, 0.046, 0.12);
      mechanicalClick(0.315, 0.07, 2550);
    } else mechanicalClick(0.09, 0.065, 3550);
  }
  if (voice.sniper) {
    noiseSweep(0.045, voice.tail, 0.08 * voice.weight, "bandpass", 890, 360, 0.85);
    const boltDelay = weapon === "operator" ? 0.3 : 0.21;
    mechanicalClick(boltDelay, 0.075 * voice.weight, voice.metal);
    mechanicalClick(boltDelay + 0.065, 0.052 * voice.weight, voice.metal * 0.86);
  }
  if (weapon === "sheriff") mechanicalClick(0.105, 0.055, 2780);
  if (weapon === "bulldog") mechanicalClick(0.075, 0.052, 3350);
}

function impactSound(hit: boolean, head: boolean) {
  if (!hit) {
    noise(0.05, 0.09, 0.045, "highpass", 2900);
    noise(0.065, 0.055, 0.025, "bandpass", 1550);
    return;
  }
  if (head) {
    noise(0.032, 0.026, 0.16, "highpass", 3600);
    noise(0.036, 0.072, 0.095, "bandpass", 1780);
    mechanicalClick(0.039, 0.11, 4300);
    noiseSweep(0.052, 0.12, 0.035, "bandpass", 2600, 980, 2.4);
    return;
  }
  noise(0.036, 0.075, 0.13, "lowpass", 680);
  noise(0.042, 0.034, 0.055, "bandpass", 1450);
  tone(68, 0.038, 0.09, 0.065, "sawtooth", 38);
}

function encounterSound() {
  noise(0, 0.022, 0.11, "highpass", 2850);
  noiseSweep(0.008, 0.19, 0.075, "bandpass", 1650, 410, 1.2);
  tone(54, 0.012, 0.2, 0.065, "sawtooth", 34);
  mechanicalClick(0.105, 0.05, 3150);
}

function skillMaterialSignature(skillId: string) {
  if (["paint", "blast"].includes(skillId)) {
    mechanicalClick(0, 0.07, 2900);
    pressureBlast(0.075, 0.08, 580, 0.12);
  } else if (["gear", "relay"].includes(skillId)) {
    electricArc(0, 0.085, 0.2);
  } else if (["trip", "camera", "turret", "alarm"].includes(skillId)) {
    servoMotion(0, 0.052, skillId === "turret" ? 0.18 : 0.12);
  } else if (["recon", "shock"].includes(skillId)) {
    mechanicalClick(0, 0.062, 3750);
    if (skillId === "shock") electricArc(0.11, 0.07, 0.16);
  } else if (["flash", "aftershock"].includes(skillId)) {
    mechanicalClick(0, 0.06, 2650);
    pressureBlast(skillId === "aftershock" ? 0.08 : 0.055, 0.09, skillId === "aftershock" ? 430 : 720, 0.14);
  } else if (["smoke", "stim"].includes(skillId)) {
    mechanicalClick(0, 0.058, 3300);
  }
}

function skillSound(skillId: string, kind: string) {
  skillMaterialSignature(skillId);
  switch (skillId) {
    case "tailwind":
      noise(0, 0.026, 0.09, "lowpass", 620);
      noiseSweep(0, 0.18, 0.13, "bandpass", 3400, 740, 0.72);
      noise(0.04, 0.055, 0.055, "highpass", 4100);
      break;
    case "updraft":
      noise(0, 0.045, 0.1, "lowpass", 470);
      noiseSweep(0.02, 0.32, 0.12, "bandpass", 420, 2850, 0.65);
      noise(0.22, 0.1, 0.045, "highpass", 3200);
      break;
    case "paint":
      noise(0, 0.012, 0.07, "highpass", 4300);
      noise(0.025, 0.018, 0.045, "bandpass", 2100);
      noiseSweep(0.045, 0.13, 0.045, "bandpass", 3100, 850, 1.1);
      noise(0.17, 0.22, 0.22, "lowpass", 760);
      tone(54, 0.17, 0.22, 0.06, "sawtooth", 29);
      [0.27, 0.34, 0.42].forEach((delay, index) => {
        noise(delay, 0.055, 0.085 - index * 0.012, "bandpass", 1700 + index * 360);
        noise(delay, 0.08, 0.065, "lowpass", 610);
      });
      break;
    case "blast":
      noise(0, 0.018, 0.065, "highpass", 3500);
      noise(0.035, 0.022, 0.055, "bandpass", 1350);
      noise(0.085, 0.14, 0.19, "lowpass", 560);
      noise(0.09, 0.055, 0.1, "highpass", 2300);
      tone(62, 0.085, 0.14, 0.055, "sawtooth", 32);
      break;
    case "curve":
      noiseSweep(0, 0.14, 0.075, "bandpass", 720, 3300, 1.25);
      noise(0.125, 0.018, 0.07, "highpass", 4400);
      noise(0.14, 0.075, 0.145, "highpass", 3000);
      tone(3360, 0.15, 0.22, 0.016, "sine", 2860);
      break;
    case "hot":
      noise(0, 0.028, 0.055, "highpass", 3700);
      noiseSweep(0.02, 0.16, 0.09, "bandpass", 2500, 480, 0.7);
      noise(0.15, 0.24, 0.11, "lowpass", 610);
      [0.19, 0.26, 0.31, 0.38].forEach((delay) => noise(delay, 0.022, 0.04, "highpass", 3200));
      break;
    case "gear":
      noise(0, 0.035, 0.055, "lowpass", 520);
      noiseSweep(0.01, 0.38, 0.105, "bandpass", 540, 3900, 1.35);
      [0.12, 0.2, 0.28].forEach((delay) => noise(delay, 0.018, 0.035, "highpass", 4200));
      break;
    case "relay":
      noiseSweep(0, 0.11, 0.055, "bandpass", 3700, 1150, 1.2);
      [0.105, 0.18].forEach((delay) => {
        noise(delay, 0.032, 0.115, "highpass", 3200);
        noise(delay, 0.11, 0.09, "lowpass", 650);
      });
      break;
    case "trip":
      noise(0, 0.018, 0.065, "highpass", 3800);
      tone(168, 0.03, 0.16, 0.032, "triangle", 118);
      noise(0.04, 0.03, 0.04, "bandpass", 1250);
      noise(0.2, 0.014, 0.05, "highpass", 4100);
      break;
    case "camera":
      noiseSweep(0, 0.2, 0.045, "bandpass", 540, 1850, 2.5);
      noise(0.2, 0.016, 0.065, "highpass", 4200);
      noise(0.235, 0.025, 0.035, "bandpass", 2200);
      break;
    case "turret":
      [0, 0.065, 0.13].forEach((delay, index) => noise(delay, 0.02, 0.075 - index * 0.01, "highpass", 3300 - index * 280));
      noiseSweep(0.04, 0.24, 0.055, "bandpass", 480, 1650, 2.3);
      noise(0.285, 0.018, 0.07, "highpass", 4100);
      tone(820, 0.3, 0.035, 0.018, "square", 710);
      break;
    case "alarm":
      noise(0, 0.018, 0.065, "highpass", 3900);
      noise(0.05, 0.028, 0.045, "bandpass", 1150);
      tone(290, 0.11, 0.055, 0.024, "square", 245);
      noise(0.17, 0.018, 0.035, "highpass", 3600);
      break;
    case "recon":
      tone(184, 0, 0.095, 0.045, "triangle", 72);
      noise(0, 0.018, 0.075, "highpass", 4100);
      noiseSweep(0.015, 0.13, 0.05, "bandpass", 3200, 760, 1.1);
      noise(0.155, 0.022, 0.065, "highpass", 3500);
      [0.21, 0.38, 0.55].forEach((delay) => {
        tone(940, delay, 0.035, 0.014, "sine", 760);
        noise(delay, 0.032, 0.03, "bandpass", 1950);
      });
      break;
    case "shock":
      tone(176, 0, 0.08, 0.038, "triangle", 68);
      noiseSweep(0.01, 0.11, 0.045, "bandpass", 3400, 980, 1.15);
      noise(0.12, 0.035, 0.13, "highpass", 3150);
      noise(0.125, 0.15, 0.11, "lowpass", 680);
      [0.15, 0.2, 0.25].forEach((delay) => noise(delay, 0.018, 0.035, "highpass", 4100));
      break;
    case "flash":
      noise(0, 0.028, 0.08, "lowpass", 720);
      noise(0.04, 0.018, 0.06, "highpass", 3900);
      noise(0.095, 0.085, 0.15, "highpass", 2850);
      noise(0.1, 0.11, 0.065, "bandpass", 1450);
      tone(2970, 0.115, 0.16, 0.012, "sine", 2560);
      break;
    case "aftershock":
      noise(0, 0.045, 0.08, "highpass", 2700);
      [0.08, 0.23, 0.39].forEach((delay, index) => {
        noise(delay, 0.16, 0.15 - index * 0.018, "lowpass", 520 - index * 55);
        noise(delay + 0.012, 0.055, 0.05, "bandpass", 1120);
      });
      tone(41, 0.08, 0.52, 0.05, "sawtooth", 26);
      break;
    case "smoke":
      noise(0, 0.03, 0.12, "lowpass", 720);
      noiseSweep(0.015, 0.16, 0.05, "bandpass", 2400, 650, 0.9);
      noise(0.17, 0.4, 0.14, "lowpass", 480);
      noiseSweep(0.18, 0.34, 0.07, "highpass", 2200, 720, 0.55);
      break;
    case "stim":
      noise(0, 0.022, 0.08, "highpass", 3300);
      noise(0.04, 0.06, 0.08, "lowpass", 580);
      [0.13, 0.2, 0.27, 0.34].forEach((delay) => noise(delay, 0.018, 0.035, "bandpass", 1550));
      tone(118, 0.12, 0.3, 0.024, "square", 104);
      break;
    case "dark":
      noiseSweep(0, 0.42, 0.115, "bandpass", 260, 1680, 0.8);
      noise(0.23, 0.3, 0.11, "lowpass", 430);
      tone(47, 0.08, 0.42, 0.045, "sawtooth", 31);
      break;
    case "shadow":
      noiseSweep(0, 0.34, 0.125, "bandpass", 360, 2100, 0.75);
      tone(43, 0, 0.31, 0.05, "sawtooth", 29);
      noise(0.31, 0.04, 0.1, "lowpass", 560);
      noise(0.32, 0.1, 0.06, "bandpass", 1280);
      break;
    default:
      noise(0, 0.022, 0.06, "highpass", kind === "deploy" ? 3900 : 3400);
      noise(0.025, 0.075, 0.055, "bandpass", kind === "smoke" ? 620 : 1250);
  }
}

function spikeSound(status: string) {
  if (status === "planting" || status === "defusing") {
    [0, 0.13, 0.26].forEach((delay) => {
      noise(delay, 0.015, 0.055, "highpass", 3800);
      noise(delay + 0.012, 0.025, 0.035, "bandpass", 1450);
    });
  } else if (status === "planted") {
    noise(0, 0.025, 0.065, "highpass", 3300);
    tone(510, 0, 0.045, 0.038, "square", 440);
    noise(0.14, 0.02, 0.055, "highpass", 3500);
    tone(510, 0.14, 0.05, 0.04, "square", 440);
  } else if (status === "half") {
    [0, 0.11].forEach((delay) => {
      noise(delay, 0.018, 0.055, "highpass", 3600);
      noise(delay + 0.01, 0.035, 0.03, "bandpass", 1320);
    });
  } else if (status === "defused") {
    noise(0, 0.024, 0.07, "highpass", 3500);
    noiseSweep(0.025, 0.3, 0.06, "bandpass", 1750, 260, 1.1);
    noise(0.22, 0.035, 0.055, "lowpass", 520);
  } else if (status === "exploded") {
    noise(0, 0.65, 0.38, "lowpass", 700);
    tone(52, 0, 0.72, 0.35, "sawtooth", 28);
    noise(0.16, 0.38, 0.14, "highpass", 2100);
  } else if (status === "dropped") {
    noise(0, 0.025, 0.08, "highpass", 2600);
    noise(0.006, 0.085, 0.09, "lowpass", 520);
  }
}

function killSound(count: number) {
  const capped = Math.min(5, Math.max(1, count));
  // A wide rising ladder communicates streak level without a cheerful melody.
  // Short resonances sit behind the mechanical confirmation transient.
  const killNotes = [146.83, 174.61, 220, 293.66]; // D3, F3, A3, D4
  const note = killNotes[Math.min(capped, 4) - 1];

  noise(0, 0.022, 0.13, "highpass", 2850 + capped * 180);
  noise(0.006, 0.11, 0.095, "bandpass", 760 + capped * 105);
  tone(64, 0, 0.19, 0.09, "sawtooth", 34);

  if (capped < 5) {
    mechanicalClick(0.012, 0.07 + capped * 0.006, 3200 + capped * 240);
    tone(note, 0.022, 0.16 + capped * 0.028, 0.046, "triangle", note * 0.985);
    tone(note * 2, 0.028, 0.1 + capped * 0.025, 0.018, "sine", note * 1.97);
    if (capped >= 3) noiseSweep(0.09, 0.18 + capped * 0.03, 0.04, "bandpass", 1050, 2450 + capped * 180, 1.7);
    if (capped === 4) {
      noise(0.24, 0.05, 0.065, "highpass", 3600);
      tone(note * 2, 0.22, 0.26, 0.025, "triangle", note * 1.98);
    }
  }

  if (capped === 5) {
    // Fifth kill climbs through three confirmations before a heavy resolution.
    [220, 293.66, 392].forEach((frequency, index) => {
      const delay = 0.035 + index * 0.125;
      tone(frequency, delay, 0.13, 0.034 - index * 0.003, "triangle", frequency * 0.985);
      tone(frequency * 2, delay + 0.006, 0.08, 0.012, "sine", frequency * 1.95);
      noise(delay, 0.018, 0.045, "highpass", 3400);
    });
    noiseSweep(0.08, 0.48, 0.07, "bandpass", 720, 3200, 1.35);
    noise(0.42, 0.11, 0.13, "highpass", 2750);
    noise(0.42, 0.34, 0.1, "lowpass", 620);
    tone(196, 0.42, 0.55, 0.075, "triangle", 192);
    tone(293.66, 0.425, 0.52, 0.046, "triangle", 288);
    tone(392, 0.43, 0.48, 0.032, "sine", 384);
    tone(49, 0.42, 0.58, 0.11, "sawtooth", 31);
  }
}

function roundSound(winner: "attack" | "defense") {
  const root = winner === "attack" ? 55 : 61.74;
  const fifth = root * 1.5;

  // Impact -> lift -> open-fifth resolution. This reads as a ceremony rather
  // than a UI jingle and leaves room for the result-card animation.
  noise(0, 0.12, 0.18, "lowpass", 610);
  noise(0, 0.035, 0.11, "highpass", 2850);
  tone(root, 0, 0.82, 0.13, "sawtooth", 31);
  tone(fifth, 0.045, 0.68, 0.052, "triangle", fifth * 0.99);
  noiseSweep(0.09, 0.56, 0.075, "bandpass", 380, 2900, 1.15);
  tone(root * 2, 0.2, 0.52, 0.038, "triangle", root * 1.98);

  noise(0.58, 0.065, 0.16, "highpass", 2450);
  noise(0.58, 0.42, 0.12, "lowpass", 720);
  tone(root, 0.58, 0.78, 0.12, "sawtooth", root * 0.62);
  tone(fifth * 2, 0.59, 0.72, 0.052, "triangle", fifth * 1.96);
  tone(root * 4, 0.6, 0.66, 0.035, "sine", root * 3.92);
  noiseSweep(0.62, 0.5, 0.052, "bandpass", 1050, 3600, 1.7);
}

export function playTacticalSound(event: TacticalSound) {
  if (!enabled) return;
  eventPan = Math.max(-1, Math.min(1, event.pan ?? 0));
  try {
    if (event.type === "encounter") encounterSound();
    else if (event.type === "shot") {
      shotSound(event.weapon, event.turret);
      impactSound(event.hit, event.head);
    } else if (event.type === "skill") skillSound(event.skillId, event.kind);
    else if (event.type === "spike") spikeSound(event.status);
    else if (event.type === "kill") killSound(event.count);
    else if (event.type === "round") roundSound(event.winner);
    else if (event.type === "turn") {
      noise(0, 0.024, 0.035, "highpass", 3000);
      noise(0.008, 0.09, 0.045, "lowpass", event.side === "attack" ? 620 : 540);
    } else {
      noise(0, 0.014, 0.035, "highpass", 3600);
      noise(0.01, 0.026, 0.018, "bandpass", 1400);
    }
  } finally {
    eventPan = 0;
  }
}
