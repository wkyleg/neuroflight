import type { AudioPolishClip, AudioPolishConfig } from '@/game/types.ts';

interface AmbientLoop {
  clip: AudioPolishClip;
  audio: HTMLAudioElement;
}

const MUSIC_ENABLED_KEY = 'neuroflight.audio.musicEnabled';
const MUSIC_VOLUME_KEY = 'neuroflight.audio.musicVolume';

function readMusicEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(MUSIC_ENABLED_KEY) !== 'false';
}

function readMusicVolume(): number {
  if (typeof window === 'undefined') return 0.24;
  const value = Number.parseFloat(window.localStorage.getItem(MUSIC_VOLUME_KEY) ?? '0.24');
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.24;
}

export class AudioPolishSystem {
  private readonly config?: AudioPolishConfig;
  private readonly ambientLoops: AmbientLoop[] = [];
  private readonly musicLoops: AmbientLoop[] = [];
  private readonly activeOneShots = new Set<HTMLAudioElement>();
  private started = false;
  private intensity = 0.65;
  private musicEnabled = readMusicEnabled();
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
      audio.volume = (clip.volume ?? 0.22) * this.musicVolume;
      this.musicLoops.push({ clip, audio });
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const loop of this.ambientLoops) {
      loop.audio.play().catch(() => {
        // Browser autoplay policies can still deny playback in some embedded contexts.
      });
    }
    if (this.musicEnabled) {
      for (const loop of this.musicLoops) {
        loop.audio.play().catch(() => {
          // Music stays optional and silent if browser policy blocks this play call.
        });
      }
    }
  }

  update(speed: number, maxSpeed: number): void {
    if (!this.started) return;
    const ratio = Math.min(1, Math.max(0, speed / maxSpeed));
    for (const loop of this.ambientLoops) {
      const baseVolume = loop.clip.volume ?? 0.08;
      loop.audio.volume = baseVolume * (0.35 + ratio * 0.45 + this.intensity * 0.2);
    }
    for (const loop of this.musicLoops) {
      const baseVolume = loop.clip.volume ?? 0.22;
      loop.audio.volume = this.musicEnabled ? baseVolume * this.musicVolume * (0.82 + this.intensity * 0.18) : 0;
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
    return this.musicEnabled;
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
    }
    for (const loop of this.musicLoops) {
      if (!enabled) {
        loop.audio.pause();
        loop.audio.volume = 0;
      } else if (this.started) {
        loop.audio.play().catch(() => {
          // Optional music can remain silent.
        });
      }
    }
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
    if (!this.started || !clips?.length) return;
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
}
