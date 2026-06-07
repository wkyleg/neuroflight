import type * as ToneNamespace from 'tone';
import type { NeuroAdaptationSnapshot } from '@/game/gameplay/NeuroAdaptationSystem.ts';
import type { GameMode } from '@/game/types.ts';
import { HeartTempoTracker, MODE_TEMPO_DEFAULTS } from './HeartTempoTracker.ts';
import { euclideanRhythm, type MotifCatalogueEntry, makeLcg, selectMotif, selectScale } from './musicMath.ts';

export type ProceduralMusicEvent = 'ring' | 'fire' | 'hit' | 'win' | 'ufoBonus' | 'crash' | 'routeComplete';

export interface ProceduralRppgInput {
  bpm: number | null;
  confidence: number;
  hrv: number | null;
  respiration: number | null;
  timestamp: number;
}

interface ToneNodes {
  limiter: ToneNamespace.Limiter;
  volume: ToneNamespace.Volume;
  reverb: ToneNamespace.Reverb;
  delay: ToneNamespace.FeedbackDelay;
  filter: ToneNamespace.Filter;
  pad: ToneNamespace.PolySynth;
  bass: ToneNamespace.Synth;
  arp: ToneNamespace.Synth;
  motif: ToneNamespace.FMSynth;
  bell: ToneNamespace.FMSynth;
  shimmer: ToneNamespace.NoiseSynth;
  pulse: ToneNamespace.MembraneSynth;
  kick: ToneNamespace.MembraneSynth;
  snare: ToneNamespace.NoiseSynth;
  hat: ToneNamespace.NoiseSynth;
  stinger: ToneNamespace.PolySynth;
  binauralVolume: ToneNamespace.Volume;
  binauralLeft: ToneNamespace.Oscillator;
  binauralRight: ToneNamespace.Oscillator;
  binauralLeftPan: ToneNamespace.Panner;
  binauralRightPan: ToneNamespace.Panner;
}

interface MusicProfile {
  root: string;
  scale: string[];
  chords: string[][];
  arpOctave: number;
  bassOctave: number;
  brightness: number;
  pulsePattern: number[];
  drumPattern: { kick: number[]; snare: number[]; hat: number[] };
  motif: MotifCatalogueEntry;
}

const MUSIC_ENABLED_KEY = 'neuroflight.audio.musicEnabled';
const MASTER_AUDIO_ENABLED_KEY = 'neuroflight.audio.masterEnabled';
const MUSIC_VOLUME_KEY = 'neuroflight.audio.musicVolume';
export const BINAURAL_ENABLED_KEY = 'neuroflight.audio.binauralEnabled';
const DEFAULT_MUSIC_VOLUME = 0.42;
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MODE_PROFILES: Record<GameMode, MusicProfile> = {
  zen: {
    root: 'D',
    scale: ['D', 'E', 'F#', 'G#', 'A', 'B', 'C#'],
    chords: [
      ['D3', 'F#3', 'A3', 'E4'],
      ['G3', 'B3', 'D4', 'A4'],
      ['A3', 'C#4', 'E4', 'B4'],
      ['E3', 'G#3', 'B3', 'F#4'],
    ],
    arpOctave: 5,
    bassOctave: 2,
    brightness: 0.72,
    pulsePattern: [0, 0, 1, 0, 0, 1, 0, 0],
    drumPattern: { kick: euclideanRhythm(2, 8), snare: euclideanRhythm(1, 8), hat: euclideanRhythm(5, 8) },
    motif: selectMotif('zen', 'zen'),
  },
  free: {
    root: 'A',
    scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'],
    chords: [
      ['A3', 'C#4', 'E4', 'G4'],
      ['D3', 'F#3', 'A3', 'E4'],
      ['G3', 'B3', 'D4', 'A4'],
      ['E3', 'G3', 'B3', 'F#4'],
    ],
    arpOctave: 5,
    bassOctave: 2,
    brightness: 0.82,
    pulsePattern: [1, 0, 0, 1, 0, 0, 1, 0],
    drumPattern: { kick: euclideanRhythm(3, 8), snare: euclideanRhythm(2, 8), hat: euclideanRhythm(5, 8) },
    motif: selectMotif('free', 'free'),
  },
  dogfight: {
    root: 'G',
    scale: ['G', 'A', 'B', 'C#', 'D', 'E', 'F'],
    chords: [
      ['G3', 'B3', 'D4', 'A4'],
      ['C3', 'E3', 'G3', 'D4'],
      ['D3', 'F#3', 'A3', 'E4'],
      ['A2', 'C#3', 'E3', 'B3'],
    ],
    arpOctave: 5,
    bassOctave: 2,
    brightness: 0.95,
    pulsePattern: [1, 0, 1, 0, 1, 1, 0, 1],
    drumPattern: { kick: euclideanRhythm(4, 8), snare: euclideanRhythm(2, 8), hat: euclideanRhythm(6, 8) },
    motif: selectMotif('dogfight', 'dogfight'),
  },
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function readMusicEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const master = window.localStorage.getItem(MASTER_AUDIO_ENABLED_KEY);
  if (master !== null) return master !== 'false';
  return window.localStorage.getItem(MUSIC_ENABLED_KEY) !== 'false';
}

function readMusicVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_MUSIC_VOLUME;
  const value = Number.parseFloat(window.localStorage.getItem(MUSIC_VOLUME_KEY) ?? String(DEFAULT_MUSIC_VOLUME));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_MUSIC_VOLUME;
}

function readBinauralEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(BINAURAL_ENABLED_KEY) !== 'false';
}

function note(profile: MusicProfile, index: number, octave: number): string {
  const scaleIndex = ((index % profile.scale.length) + profile.scale.length) % profile.scale.length;
  return `${profile.scale[scaleIndex]}${octave}`;
}

function volumeDb(volume: number, enabled: boolean): number {
  if (!enabled || volume <= 0.001) return -72;
  return -24 + volume * 24;
}

export function getModeMusicProfile(mode: GameMode): MusicProfile {
  return MODE_PROFILES[mode] ?? MODE_PROFILES.zen;
}

function transposeScale(root: string, intervals: number[]): string[] {
  const rootIndex = Math.max(0, CHROMATIC.indexOf(root.replace(/\d/g, '')));
  return intervals.map((interval) => CHROMATIC[(rootIndex + interval) % CHROMATIC.length]);
}

export function createSeededMusicProfile(mode: GameMode, seed: string): MusicProfile {
  const base = getModeMusicProfile(mode);
  const rng = makeLcg(seed);
  const scale = transposeScale(base.root, selectScale(seed, mode).intervals);
  const chordRoots = [0, 3, 4, 1].map((index) => scale[index % scale.length]);
  const chords = chordRoots.map((root, index) => {
    const rootIndex = Math.max(0, scale.indexOf(root));
    return [0, 2, 4, 6].map((offset) => `${scale[(rootIndex + offset) % scale.length]}${index === 3 ? 3 : 4}`);
  });
  return {
    ...base,
    scale,
    chords,
    brightness: Math.max(0.55, Math.min(1.05, base.brightness + (rng() - 0.5) * 0.12)),
    motif: selectMotif(seed, mode),
  };
}

export class ProceduralFlightMusicSystem {
  private readonly heartTempo = new HeartTempoTracker();
  private tone: typeof ToneNamespace | null = null;
  private nodes: ToneNodes | null = null;
  private mode: GameMode;
  private adaptation: NeuroAdaptationSnapshot | null = null;
  private rppg: ProceduralRppgInput | null = null;
  private enabled = readMusicEnabled();
  private binauralEnabled = readBinauralEnabled();
  private volume = readMusicVolume();
  private started = false;
  private startPromise: Promise<void> | null = null;
  private scheduleIds: number[] = [];
  private phrase = 0;
  private step = 0;
  private activeProfile: MusicProfile;

  constructor(mode: GameMode) {
    this.mode = mode;
    this.activeProfile = getModeMusicProfile(mode);
  }

  async start(): Promise<void> {
    if (this.started) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.init();
    return this.startPromise;
  }

  stop(): void {
    if (!this.tone || !this.started) return;
    this.tone.Transport.pause();
    this.nodes?.volume.volume.rampTo(-72, 0.25);
    this.nodes?.binauralVolume.volume.rampTo(-72, 0.25);
  }

  destroy(): void {
    if (this.tone) {
      for (const id of this.scheduleIds) {
        this.tone.Transport.clear(id);
      }
      this.scheduleIds.length = 0;
    }
    if (this.nodes) {
      for (const node of Object.values(this.nodes)) {
        node.dispose();
      }
    }
    this.nodes = null;
    this.tone = null;
    this.started = false;
    this.startPromise = null;
    this.heartTempo.reset();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MASTER_AUDIO_ENABLED_KEY, enabled ? 'true' : 'false');
      window.localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
    }
    this.nodes?.volume.volume.rampTo(volumeDb(this.volume, enabled), 0.4);
    if (enabled && this.started) {
      this.tone?.Transport.start();
      this.updateBinauralState(0.3);
    } else if (!enabled) {
      this.tone?.Transport.pause();
      this.nodes?.binauralVolume.volume.rampTo(-72, 0.25);
    }
  }

  toggleMusic(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  isMusicEnabled(): boolean {
    return this.enabled;
  }

  toggleSound(): boolean {
    return this.toggleMusic();
  }

  isSoundEnabled(): boolean {
    return this.isMusicEnabled();
  }

  setMusicVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(this.volume));
    }
    this.nodes?.volume.volume.rampTo(volumeDb(this.volume, this.enabled), 0.4);
  }

  setMode(mode: GameMode): void {
    this.mode = mode;
    this.activeProfile = getModeMusicProfile(mode);
    this.updateToneState(4);
  }

  setSessionSeed(seed: string): void {
    this.activeProfile = createSeededMusicProfile(this.mode, seed);
  }

  setBinauralEnabled(enabled: boolean): void {
    this.binauralEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BINAURAL_ENABLED_KEY, enabled ? 'true' : 'false');
    }
    this.updateBinauralState(0.6);
  }

  isBinauralEnabled(): boolean {
    return this.binauralEnabled;
  }

  setRppg(input: ProceduralRppgInput): void {
    this.rppg = input;
    this.heartTempo.addSample({ bpm: input.bpm, confidence: input.confidence, timestamp: input.timestamp });
    this.updateToneState(4.5);
  }

  setAdaptation(adaptation: NeuroAdaptationSnapshot): void {
    this.adaptation = adaptation;
    this.updateToneState(3.2);
  }

  triggerEvent(event: ProceduralMusicEvent): void {
    if (!this.tone || !this.nodes || !this.started || !this.enabled) return;
    const time = this.tone.now();
    const profile = this.activeProfile;
    switch (event) {
      case 'fire':
        this.nodes.pulse.triggerAttackRelease('C2', '32n', time, 0.32);
        this.nodes.bell.triggerAttackRelease('G5', '32n', time + 0.02, 0.18);
        return;
      case 'hit':
        this.nodes.pulse.triggerAttackRelease('D2', '16n', time, 0.4);
        this.nodes.stinger.triggerAttackRelease([note(profile, 0, 5), note(profile, 2, 5)], '16n', time + 0.03, 0.18);
        return;
      case 'win':
        this.nodes.stinger.triggerAttackRelease(
          profile.chords[0].map((n) => n.replace('3', '4')),
          '2n',
          time,
          0.34,
        );
        return;
      case 'ufoBonus':
        this.nodes.stinger.triggerAttackRelease(['G5', 'B5', 'D6', 'A6'], '4n', time, 0.42);
        this.nodes.bell.triggerAttackRelease('E6', '8n', time + 0.12, 0.34);
        return;
      case 'crash':
        this.nodes.pulse.triggerAttackRelease('G1', '8n', time, 0.44);
        this.nodes.shimmer.triggerAttackRelease('16n', time, 0.18);
        return;
      case 'routeComplete':
        this.nodes.stinger.triggerAttackRelease(
          profile.chords[1].map((n) => n.replace('3', '4')),
          '1n',
          time,
          0.32,
        );
        return;
      case 'ring':
        this.nodes.bell.triggerAttackRelease(note(profile, this.step + 3, 6), '16n', time, 0.22);
        return;
    }
  }

  getTargetTempo(now: number): number {
    return this.heartTempo.getTargetTempo(this.mode, now);
  }

  getHeartTempoMedian(now: number): number {
    return this.heartTempo.getMedianBpm(this.mode, now);
  }

  private async init(): Promise<void> {
    this.tone = await import('tone');
    const tone = this.tone;
    await tone.start();
    this.nodes = await this.createNodes(tone);
    this.scheduleArrangement(tone);
    this.updateToneState(0.1);
    tone.Transport.bpm.value = MODE_TEMPO_DEFAULTS[this.mode];
    tone.Transport.start();
    this.started = true;
  }

  private async createNodes(tone: typeof ToneNamespace): Promise<ToneNodes> {
    const limiter = new tone.Limiter(-6).toDestination();
    const volume = new tone.Volume(volumeDb(this.volume, this.enabled)).connect(limiter);
    const reverb = new tone.Reverb({ decay: 9.5, wet: 0.48 }).connect(volume);
    await reverb.generate();
    const delay = new tone.FeedbackDelay({ delayTime: '4n.', feedback: 0.34, wet: 0.24 }).connect(reverb);
    const filter = new tone.Filter({ frequency: 1550, type: 'lowpass', rolloff: -12, Q: 0.6 }).connect(delay);
    const binauralVolume = new tone.Volume(-72).connect(limiter);
    const binauralLeftPan = new tone.Panner(-1).connect(binauralVolume);
    const binauralRightPan = new tone.Panner(1).connect(binauralVolume);
    const binauralLeft = new tone.Oscillator({ frequency: 180, type: 'sine' }).connect(binauralLeftPan);
    const binauralRight = new tone.Oscillator({ frequency: 188, type: 'sine' }).connect(binauralRightPan);
    binauralLeft.start();
    binauralRight.start();

    return {
      limiter,
      volume,
      reverb,
      delay,
      filter,
      pad: new tone.PolySynth(tone.Synth, {
        oscillator: { type: 'sine8' },
        envelope: { attack: 4.5, decay: 0.7, sustain: 0.86, release: 8.5 },
        volume: -12,
      }).connect(filter),
      bass: new tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.8, sustain: 0.36, release: 2.4 },
        volume: -25,
      }).connect(filter),
      arp: new tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.08, decay: 0.5, sustain: 0.18, release: 1.2 },
        volume: -26,
      }).connect(delay),
      motif: new tone.FMSynth({
        harmonicity: 1.01,
        modulationIndex: 1.8,
        envelope: { attack: 0.08, decay: 0.9, sustain: 0.2, release: 2.8 },
        modulationEnvelope: { attack: 0.2, decay: 1.0, sustain: 0.08, release: 1.6 },
        volume: -21,
      }).connect(reverb),
      bell: new tone.FMSynth({
        harmonicity: 1.52,
        modulationIndex: 4.2,
        envelope: { attack: 0.01, decay: 0.36, sustain: 0.08, release: 0.9 },
        modulationEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.04, release: 0.45 },
        volume: -23,
      }).connect(reverb),
      shimmer: new tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.18, decay: 0.6, sustain: 0.05, release: 1.6 },
        volume: -36,
      }).connect(reverb),
      pulse: new tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3.2,
        envelope: { attack: 0.002, decay: 0.18, sustain: 0.01, release: 0.2 },
        volume: -31,
      }).connect(filter),
      kick: new tone.MembraneSynth({
        pitchDecay: 0.018,
        octaves: 3.8,
        envelope: { attack: 0.002, decay: 0.16, sustain: 0.01, release: 0.18 },
        volume: -38,
      }).connect(filter),
      snare: new tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.08 },
        volume: -42,
      }).connect(filter),
      hat: new tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.03 },
        volume: -48,
      }).connect(filter),
      stinger: new tone.PolySynth(tone.Synth, {
        oscillator: { type: 'sine8' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.18, release: 1.4 },
        volume: -15,
      }).connect(reverb),
      binauralVolume,
      binauralLeft,
      binauralRight,
      binauralLeftPan,
      binauralRightPan,
    };
  }

  private scheduleArrangement(tone: typeof ToneNamespace): void {
    this.scheduleIds.push(
      tone.Transport.scheduleRepeat((time) => this.playChord(time), '1m'),
      tone.Transport.scheduleRepeat((time) => this.playBass(time), '4n'),
      tone.Transport.scheduleRepeat((time) => this.playArp(time), '8n'),
      tone.Transport.scheduleRepeat((time) => this.playMotif(time), '2m'),
      tone.Transport.scheduleRepeat((time) => this.playBell(time), '2m'),
      tone.Transport.scheduleRepeat((time) => this.playShimmer(time), '1m'),
      tone.Transport.scheduleRepeat((time) => this.playPulse(time), '8n'),
      tone.Transport.scheduleRepeat((time) => this.playDrums(time), '16n'),
    );
  }

  private playChord(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const chord = profile.chords[this.phrase % profile.chords.length];
    const openness = clamp01(((this.rppg?.hrv ?? 42) - 20) / 80);
    const voicedChord = openness > 0.55 ? [...chord, note(profile, this.phrase + 4, 5)] : chord;
    this.nodes.pad.triggerAttackRelease(voicedChord, '1m', time, 0.22 + openness * 0.12);
    this.phrase++;
  }

  private playBass(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const rootIndex = Math.floor(this.step / 4) % profile.chords.length;
    const bassNote = profile.chords[rootIndex][0].replace(/\d$/, String(profile.bassOctave));
    this.nodes.bass.triggerAttackRelease(bassNote, '2n', time, 0.08 + clamp01(this.adaptation?.load ?? 0.35) * 0.06);
  }

  private playArp(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const flow = clamp01(this.adaptation?.flow ?? 0.45);
    const confidence = clamp01(this.rppg?.confidence ?? this.adaptation?.confidence ?? 0.35);
    const interval = flow > 0.62 ? 1 : 2;
    const index = this.step * interval + (confidence > 0.55 ? this.phrase : 0);
    if (this.step % (this.mode === 'dogfight' ? 2 : 4) === 0) {
      this.nodes.arp.triggerAttackRelease(note(profile, index, profile.arpOctave), '8n', time, 0.04 + flow * 0.09);
    }
    this.step++;
  }

  private playMotif(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const motif = profile.motif;
    const flow = clamp01(this.adaptation?.flow ?? 0.45);
    const start = this.phrase % motif.intervals.length;
    motif.intervals.forEach((interval, offset) => {
      const rhythm = motif.rhythm[(start + offset) % motif.rhythm.length] ?? 1;
      const noteTime = time + offset * 0.34 * rhythm;
      this.nodes?.motif.triggerAttackRelease(
        note(profile, interval + this.phrase, profile.arpOctave),
        '2n',
        noteTime,
        0.05 + flow * 0.07,
      );
    });
  }

  private playBell(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const composure = clamp01(this.adaptation?.composure ?? 0.5);
    this.nodes.bell.triggerAttackRelease(note(profile, this.phrase + 2, 6), '4n', time, 0.08 + composure * 0.16);
  }

  private playShimmer(time: number): void {
    if (!this.nodes) return;
    const respiration = this.rppg?.respiration ?? 8;
    const swell = clamp01((respiration - 4) / 14);
    this.nodes.shimmer.triggerAttackRelease('2n', time, 0.04 + swell * 0.16);
  }

  private playPulse(time: number): void {
    if (!this.nodes) return;
    const profile = this.activeProfile;
    const load = clamp01(this.adaptation?.load ?? 0.35);
    const pattern = profile.pulsePattern[this.step % profile.pulsePattern.length];
    if (pattern || (this.mode === 'dogfight' && load > 0.7 && this.step % 4 === 3)) {
      this.nodes.pulse.triggerAttackRelease(note(profile, 0, 2), '16n', time, 0.035 + load * 0.08);
    }
  }

  private playDrums(time: number): void {
    if (!this.nodes) return;
    const pattern = this.activeProfile.drumPattern;
    const index = this.step % pattern.kick.length;
    const load = clamp01(this.adaptation?.load ?? 0.35);
    const flow = clamp01(this.adaptation?.flow ?? 0.45);
    if (this.mode === 'zen' && load < 0.55) return;
    if (pattern.kick[index]) this.nodes.kick.triggerAttackRelease('C1', '32n', time, 0.025 + load * 0.035);
    if (pattern.snare[index] && this.mode === 'dogfight')
      this.nodes.snare.triggerAttackRelease('32n', time, 0.02 + load * 0.03);
    if (pattern.hat[index] && flow > 0.48) this.nodes.hat.triggerAttackRelease('64n', time, 0.01 + flow * 0.025);
  }

  private updateToneState(rampSeconds: number): void {
    if (!this.tone || !this.nodes) return;
    const now = this.rppg?.timestamp ?? performance.now() / 1000;
    const targetTempo = this.heartTempo.getTargetTempo(this.mode, now);
    this.tone.Transport.bpm.rampTo(targetTempo, rampSeconds);

    const load = clamp01(this.adaptation?.load ?? 0.35);
    const flow = clamp01(this.adaptation?.flow ?? 0.45);
    const composure = clamp01(this.adaptation?.composure ?? 0.5);
    const confidence = clamp01(this.rppg?.confidence ?? this.adaptation?.confidence ?? 0.35);
    const profile = this.activeProfile;

    const recovery = (this.adaptation?.recovery ?? 0.5) > 0.66;
    const brightness = recovery
      ? 720 + profile.brightness * 520 + composure * 280
      : 980 + profile.brightness * 900 + flow * 780 + confidence * 220 + load * 260;
    this.nodes.filter.frequency.rampTo(brightness, rampSeconds);
    this.nodes.reverb.wet.rampTo(
      recovery ? 0.58 : 0.34 + composure * 0.18 + clamp01((this.rppg?.hrv ?? 36) / 120) * 0.1,
      rampSeconds,
    );
    this.nodes.delay.wet.rampTo(recovery ? 0.28 : 0.12 + flow * 0.16, rampSeconds);
    this.nodes.volume.volume.rampTo(volumeDb(this.volume, this.enabled), rampSeconds);
    this.updateBinauralState(rampSeconds);
  }

  private updateBinauralState(rampSeconds: number): void {
    if (!this.nodes) return;
    const recovery = (this.adaptation?.recovery ?? 0.5) > 0.66;
    const beatHz = recovery ? 8 : this.mode === 'dogfight' ? 16 : 14;
    const rootIndex = CHROMATIC.indexOf(this.activeProfile.scale[0].replace(/\d/g, ''));
    const carrier = 174 + Math.max(0, rootIndex) * 5 + (this.mode === 'dogfight' ? 24 : this.mode === 'free' ? 12 : 0);
    this.nodes.binauralLeft.frequency.rampTo(carrier, rampSeconds);
    this.nodes.binauralRight.frequency.rampTo(carrier + beatHz, rampSeconds);
    this.nodes.binauralVolume.volume.rampTo(this.enabled && this.binauralEnabled ? -42 : -72, rampSeconds);
  }
}
