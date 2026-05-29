import type { AudioPolishClip, AudioPolishConfig } from '@/game/types.ts';

interface AmbientLoop {
  clip: AudioPolishClip;
  audio: HTMLAudioElement;
}

export class AudioPolishSystem {
  private readonly config?: AudioPolishConfig;
  private readonly ambientLoops: AmbientLoop[] = [];
  private readonly activeOneShots = new Set<HTMLAudioElement>();
  private started = false;

  constructor(config?: AudioPolishConfig) {
    this.config = config;

    for (const clip of config?.ambientLoops ?? []) {
      const audio = new Audio(clip.path);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = clip.volume ?? 0.08;
      this.ambientLoops.push({ clip, audio });
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
  }

  update(speed: number, maxSpeed: number): void {
    if (!this.started) return;
    const ratio = Math.min(1, Math.max(0, speed / maxSpeed));
    for (const loop of this.ambientLoops) {
      const baseVolume = loop.clip.volume ?? 0.08;
      loop.audio.volume = baseVolume * (0.45 + ratio * 0.55);
    }
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

  destroy(): void {
    for (const loop of this.ambientLoops) {
      loop.audio.pause();
      loop.audio.src = '';
    }
    for (const audio of this.activeOneShots) {
      audio.pause();
      audio.src = '';
    }
    this.activeOneShots.clear();
    this.ambientLoops.length = 0;
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
