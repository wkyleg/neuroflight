import type { AudioPolishClip, AudioPolishConfig } from '@/game/types.ts';

interface AmbientLoop {
  clip: AudioPolishClip;
  audio: HTMLAudioElement;
}

const MUSIC_ENABLED_KEY = 'neuroflight.audio.musicEnabled';
const MASTER_AUDIO_ENABLED_KEY = 'neuroflight.audio.masterEnabled';
const MUSIC_VOLUME_KEY = 'neuroflight.audio.musicVolume';
const DEFAULT_MUSIC_VOLUME = 0.16;

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

export class AudioPolishSystem {
  private readonly config?: AudioPolishConfig;
  private readonly ambientLoops: AmbientLoop[] = [];
  private readonly musicLoops: AmbientLoop[] = [];
  private readonly activeOneShots = new Set<HTMLAudioElement>();
  private started = false;
  private intensity = 0.65;
  private masterEnabled = readMusicEnabled();
  private musicVolume = readMusicVolume();

  constructor(config?: AudioPolishConfig) {
    this.config = config;

    for (const clip of config?.ambientLoops ?? []) {
      const audio = new Audio(clip.path);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = clip.volume ?? 0.08;
      this.ambientLoops.push({ clip, audio });
    }
    for (const clip of config?.musicLoops ?? []) {
      const audio = new Audio(clip.path);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = (clip.volume ?? 0.16) * this.musicVolume;
      this.musicLoops.push({ clip, audio });
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    if (this.masterEnabled) {
      this.playLoops();
    }
  }

  update(speed: number, maxSpeed: number): void {
    if (!this.started) return;
    const ratio = Math.min(1, Math.max(0, speed / maxSpeed));
    for (const loop of this.ambientLoops) {
      const baseVolume = loop.clip.volume ?? 0.08;
      loop.audio.volume = this.masterEnabled ? baseVolume * (0.35 + ratio * 0.45 + this.intensity * 0.2) : 0;
    }
    for (const loop of this.musicLoops) {
      const baseVolume = loop.clip.volume ?? 0.16;
      loop.audio.volume = this.masterEnabled ? baseVolume * this.musicVolume * (0.82 + this.intensity * 0.18) : 0;
    }
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  playWeapon(): void {
    this.playRandom(this.config?.weaponOneShots);
  }

  playImpact(): void {
    this.playRandom(this.config?.impactOneShots);
  }

  playExplosion(): void {
    this.playRandom(this.config?.explosionOneShots);
  }

  playUi(): void {
    this.playRandom(this.config?.uiOneShots);
  }

  isMusicEnabled(): boolean {
    return this.masterEnabled;
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.masterEnabled);
    return this.masterEnabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.masterEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MASTER_AUDIO_ENABLED_KEY, enabled ? 'true' : 'false');
      window.localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
    }
    for (const loop of [...this.ambientLoops, ...this.musicLoops]) {
      if (!enabled) {
        loop.audio.pause();
        loop.audio.volume = 0;
      } else if (this.started) {
        this.playLoops();
        break;
      }
    }
  }

  setMasterEnabled(enabled: boolean): void {
    this.setMusicEnabled(enabled);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicVolume));
    }
  }

  destroy(): void {
    for (const loop of this.ambientLoops) {
      loop.audio.pause();
      loop.audio.src = '';
    }
    for (const loop of this.musicLoops) {
      loop.audio.pause();
      loop.audio.src = '';
    }
    for (const audio of this.activeOneShots) {
      audio.pause();
      audio.src = '';
    }
    this.activeOneShots.clear();
    this.ambientLoops.length = 0;
    this.musicLoops.length = 0;
    this.started = false;
  }

  private playRandom(clips?: AudioPolishClip[]): void {
    if (!this.started || !this.masterEnabled || !clips?.length) return;
    const clip = clips[Math.floor(Math.random() * clips.length)];
    const audio = new Audio(clip.path);
    audio.preload = 'auto';
    audio.volume = clip.volume ?? 0.12;
    const rateRange = clip.rateRange ?? [0.96, 1.04];
    audio.playbackRate = rateRange[0] + Math.random() * (rateRange[1] - rateRange[0]);
    this.activeOneShots.add(audio);
    audio.addEventListener(
      'ended',
      () => {
        this.activeOneShots.delete(audio);
      },
      { once: true },
    );
    audio.play().catch(() => {
      this.activeOneShots.delete(audio);
    });
  }

  private playLoops(): void {
    for (const loop of this.ambientLoops) {
      loop.audio.play().catch(() => {
        // Browser autoplay policies can still deny playback in some embedded contexts.
      });
    }
    for (const loop of this.musicLoops) {
      loop.audio.play().catch(() => {
        // Optional music can remain silent.
      });
    }
  }
}
