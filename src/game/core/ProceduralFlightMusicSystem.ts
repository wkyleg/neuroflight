import type * as ToneNamespace from 'tone';
import type { NeuroAdaptationSnapshot } from '@/game/gameplay/NeuroAdaptationSystem.ts';
import type { GameMode } from '@/game/types.ts';
import { HeartTempoTracker, MODE_TEMPO_DEFAULTS } from './HeartTempoTracker.ts';

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
  bell: ToneNamespace.FMSynth;
  shimmer: ToneNamespace.NoiseSynth;
  pulse: ToneNamespace.MembraneSynth;
  stinger: ToneNamespace.PolySynth;
}

interface MusicProfile {
  root: string;
  scale: string[];
  chords: string[][];
  arpOctave: number;
  bassOctave: number;
  brightness: number;
  pulsePattern: number[];
}

const MUSIC_ENABLED_KEY = 'neuroflight.audio.musicEnabled';
const MASTER_AUDIO_ENABLED_KEY = 'neuroflight.audio.masterEnabled';
const MUSIC_VOLUME_KEY = 'neuroflight.audio.musicVolume';
const DEFAULT_MUSIC_VOLUME = 0.15;

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

function note(profile: MusicProfile, index: number, octave: number): string {
  const scaleIndex = ((index % profile.scale.length) + profile.scale.length) % profile.scale.length;
  return `${profile.scale[scaleIndex]}${octave}`;
}

function volumeDb(volume: number, enabled: boolean): number {
  if (!enabled || volume <= 0.001) return -48;
  return -28 + volume * 22;
}

export function getModeMusicProfile(mode: GameMode): MusicProfile {
  return MODE_PROFILES[mode] ?? MODE_PROFILES.zen;
}

export class ProceduralFlightMusicSystem {
  private readonly heartTempo = new HeartTempoTracker();
  private tone: typeof ToneNamespace | null = null;
  private nodes: ToneNodes | null = null;
  private mode: GameMode;
  private adaptation: NeuroAdaptationSnapshot | null = null;
  private rppg: ProceduralRppgInput | null = null;
  private enabled = readMusicEnabled();
  private volume = readMusicVolume();
  private started = false;
  private startPromise: Promise<void> | null = null;
  private scheduleIds: number[] = [];
  private phrase = 0;
  private step = 0;

  constructor(mode: GameMode) {
    this.mode = mode;
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
    this.nodes?.volume.volume.rampTo(-48, 0.45);
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
    this.updateToneState(4);
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
    const profile = getModeMusicProfile(this.mode);
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
    const reverb = new tone.Reverb({ decay: 5.2, wet: 0.34 }).connect(volume);
    await reverb.generate();
    const delay = new tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.22, wet: 0.18 }).connect(reverb);
    const filter = new tone.Filter({ frequency: 1850, type: 'lowpass', rolloff: -12, Q: 0.7 }).connect(delay);

    return {
      limiter,
      volume,
      reverb,
      delay,
      filter,
      pad: new tone.PolySynth(tone.Synth, {
        oscillator: { type: 'triangle8' },
        envelope: { attack: 1.4, decay: 0.25, sustain: 0.74, release: 3.2 },
        volume: -17,
      }).connect(filter),
      bass: new tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.18, sustain: 0.42, release: 0.6 },
        volume: -18,
      }).connect(filter),
      arp: new tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.16, release: 0.25 },
        volume: -20,
      }).connect(delay),
      bell: new tone.FMSynth({
        harmonicity: 1.52,
        modulationIndex: 4.2,
        envelope: { attack: 0.01, decay: 0.36, sustain: 0.08, release: 0.9 },
        modulationEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.04, release: 0.45 },
        volume: -20,
      }).connect(reverb),
      shimmer: new tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.18, decay: 0.6, sustain: 0.05, release: 1.6 },
        volume: -30,
      }).connect(reverb),
      pulse: new tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3.2,
        envelope: { attack: 0.002, decay: 0.18, sustain: 0.01, release: 0.2 },
        volume: -23,
      }).connect(filter),
      stinger: new tone.PolySynth(tone.Synth, {
        oscillator: { type: 'sine8' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.18, release: 1.4 },
        volume: -15,
      }).connect(reverb),
    };
  }

  private scheduleArrangement(tone: typeof ToneNamespace): void {
    this.scheduleIds.push(
      tone.Transport.scheduleRepeat((time) => this.playChord(time), '1m'),
      tone.Transport.scheduleRepeat((time) => this.playBass(time), '4n'),
      tone.Transport.scheduleRepeat((time) => this.playArp(time), '8n'),
      tone.Transport.scheduleRepeat((time) => this.playBell(time), '2m'),
      tone.Transport.scheduleRepeat((time) => this.playShimmer(time), '1m'),
      tone.Transport.scheduleRepeat((time) => this.playPulse(time), '8n'),
    );
  }

  private playChord(time: number): void {
    if (!this.nodes) return;
    const profile = getModeMusicProfile(this.mode);
    const chord = profile.chords[this.phrase % profile.chords.length];
    const openness = clamp01(((this.rppg?.hrv ?? 42) - 20) / 80);
    const voicedChord = openness > 0.55 ? [...chord, note(profile, this.phrase + 4, 5)] : chord;
    this.nodes.pad.triggerAttackRelease(voicedChord, '1m', time, 0.18 + openness * 0.1);
    this.phrase++;
  }

  private playBass(time: number): void {
    if (!this.nodes) return;
    const profile = getModeMusicProfile(this.mode);
    const rootIndex = Math.floor(this.step / 4) % profile.chords.length;
    const bassNote = profile.chords[rootIndex][0].replace(/\d$/, String(profile.bassOctave));
    this.nodes.bass.triggerAttackRelease(bassNote, '8n', time, 0.18 + clamp01(this.adaptation?.load ?? 0.35) * 0.12);
  }

  private playArp(time: number): void {
    if (!this.nodes) return;
    const profile = getModeMusicProfile(this.mode);
    const flow = clamp01(this.adaptation?.flow ?? 0.45);
    const confidence = clamp01(this.rppg?.confidence ?? this.adaptation?.confidence ?? 0.35);
    const interval = flow > 0.62 ? 1 : 2;
    const index = this.step * interval + (confidence > 0.55 ? this.phrase : 0);
    this.nodes.arp.triggerAttackRelease(note(profile, index, profile.arpOctave), '16n', time, 0.08 + flow * 0.14);
    this.step++;
  }

  private playBell(time: number): void {
    if (!this.nodes) return;
    const profile = getModeMusicProfile(this.mode);
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
    const profile = getModeMusicProfile(this.mode);
    const load = clamp01(this.adaptation?.load ?? 0.35);
    const pattern = profile.pulsePattern[this.step % profile.pulsePattern.length];
    if (pattern || (this.mode === 'dogfight' && load > 0.62 && this.step % 4 === 3)) {
      this.nodes.pulse.triggerAttackRelease(note(profile, 0, 2), '32n', time, 0.08 + load * 0.16);
    }
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
    const profile = getModeMusicProfile(this.mode);

    const brightness = 900 + profile.brightness * 1000 + flow * 1200 + confidence * 450 - composure * 240 + load * 360;
    this.nodes.filter.frequency.rampTo(brightness, rampSeconds);
    this.nodes.reverb.wet.rampTo(0.2 + composure * 0.2 + clamp01((this.rppg?.hrv ?? 36) / 120) * 0.12, rampSeconds);
    this.nodes.delay.wet.rampTo(0.08 + flow * 0.2, rampSeconds);
    this.nodes.volume.volume.rampTo(volumeDb(this.volume, this.enabled), rampSeconds);
  }
}
