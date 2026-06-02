import type { AircraftDefinition } from '@/game/types.ts';

type AircraftAudioProfile = NonNullable<AircraftDefinition['audioProfile']>;

const ENGINE_PROFILES: Record<
  AircraftAudioProfile,
  {
    oscillator: OscillatorType;
    baseFrequency: number;
    frequencyRange: number;
    filterBase: number;
    filterRange: number;
    gainBase: number;
    gainRange: number;
    detune: number;
    fireBase: number;
    fireEnd: number;
    fireFilter: number;
  }
> = {
  'light-prop': {
    oscillator: 'triangle',
    baseFrequency: 68,
    frequencyRange: 118,
    filterBase: 230,
    filterRange: 460,
    gainBase: 0.012,
    gainRange: 0.022,
    detune: 8,
    fireBase: 170,
    fireEnd: 82,
    fireFilter: 1100,
  },
  'vintage-prop': {
    oscillator: 'triangle',
    baseFrequency: 48,
    frequencyRange: 82,
    filterBase: 180,
    filterRange: 330,
    gainBase: 0.01,
    gainRange: 0.018,
    detune: 14,
    fireBase: 145,
    fireEnd: 76,
    fireFilter: 880,
  },
  'sport-prop': {
    oscillator: 'sawtooth',
    baseFrequency: 88,
    frequencyRange: 150,
    filterBase: 290,
    filterRange: 620,
    gainBase: 0.013,
    gainRange: 0.027,
    detune: 6,
    fireBase: 210,
    fireEnd: 96,
    fireFilter: 1320,
  },
  jet: {
    oscillator: 'sawtooth',
    baseFrequency: 44,
    frequencyRange: 78,
    filterBase: 440,
    filterRange: 900,
    gainBase: 0.016,
    gainRange: 0.03,
    detune: -11,
    fireBase: 190,
    fireEnd: 72,
    fireFilter: 1180,
  },
  'heavy-jet': {
    oscillator: 'sawtooth',
    baseFrequency: 36,
    frequencyRange: 66,
    filterBase: 380,
    filterRange: 760,
    gainBase: 0.017,
    gainRange: 0.031,
    detune: -15,
    fireBase: 176,
    fireEnd: 68,
    fireFilter: 980,
  },
  'heavy-turbine': {
    oscillator: 'sawtooth',
    baseFrequency: 40,
    frequencyRange: 72,
    filterBase: 350,
    filterRange: 700,
    gainBase: 0.014,
    gainRange: 0.026,
    detune: -9,
    fireBase: 160,
    fireEnd: 70,
    fireFilter: 920,
  },
  'sci-fi': {
    oscillator: 'square',
    baseFrequency: 92,
    frequencyRange: 120,
    filterBase: 640,
    filterRange: 1200,
    gainBase: 0.01,
    gainRange: 0.022,
    detune: 18,
    fireBase: 260,
    fireEnd: 120,
    fireFilter: 1700,
  },
};

function getEngineProfile(profile?: AircraftAudioProfile) {
  return ENGINE_PROFILES[profile ?? 'light-prop'];
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windNoise: AudioBufferSourceNode | null = null;
  private started = false;

  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  start(): void {
    if (this.started) return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    this.started = true;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.02;
    this.engineGain.connect(ctx.destination);

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 300;
    this.engineFilter.Q.value = 1.0;
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'triangle';
    this.engineOsc1.frequency.value = 80;
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc1.start();

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 80;
    this.engineOsc2.detune.value = 7;
    this.engineOsc2.connect(this.engineFilter);
    this.engineOsc2.start();

    // LFO for heart rate sync (initially disconnected)
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0;
    this.lfoGain.connect(this.engineGain.gain);

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 1.0;
    this.lfo.connect(this.lfoGain);
    this.lfo.start();

    // Wind noise
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.01;
    this.windGain.connect(ctx.destination);

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    this.windNoise = ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 400;
    this.windNoise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windNoise.start();
  }

  updateEngine(speed: number, maxSpeed: number, profile?: AircraftAudioProfile): void {
    if (!this.engineOsc1 || !this.engineOsc2 || !this.engineGain || !this.engineFilter) return;
    const settings = getEngineProfile(profile);
    const ratio = Math.max(0, Math.min(1, speed / maxSpeed));
    const freq = settings.baseFrequency + ratio * settings.frequencyRange;
    this.engineOsc1.type = settings.oscillator;
    this.engineOsc2.type = settings.oscillator;
    this.engineOsc1.frequency.value = freq;
    this.engineOsc2.frequency.value = freq;
    this.engineOsc2.detune.value = settings.detune;
    this.engineFilter.frequency.value = settings.filterBase + ratio * settings.filterRange;
    this.engineGain.gain.value = settings.gainBase + ratio * settings.gainRange;
  }

  updateWind(speed: number, maxSpeed: number): void {
    if (!this.windGain) return;
    const ratio = speed / maxSpeed;
    this.windGain.gain.value = ratio * 0.04;
  }

  setBpm(bpm: number | null): void {
    if (!this.lfo || !this.lfoGain) return;
    if (bpm && bpm > 30 && bpm < 220) {
      this.lfo.frequency.value = bpm / 60;
      this.lfoGain.gain.value = 0.008;
    } else {
      this.lfoGain.gain.value = 0;
    }
  }

  playChime(): void {
    const ctx = this.ensureContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 660;
    osc2.type = 'sine';
    osc2.frequency.value = 990;

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.3;
    osc2.connect(gain2);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    gain2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  }

  playFireLaunch(profile?: AircraftAudioProfile): void {
    const ctx = this.ensureContext();
    const settings = getEngineProfile(profile);
    const osc = ctx.createOscillator();
    const grit = ctx.createBufferSource();
    const gain = ctx.createGain();
    const gritGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.24));
    }

    osc.type = settings.oscillator === 'triangle' ? 'sawtooth' : settings.oscillator;
    osc.frequency.setValueAtTime(settings.fireBase, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(settings.fireEnd, ctx.currentTime + 0.1);
    grit.buffer = buffer;
    gritGain.gain.value = 0.18;

    filter.type = 'bandpass';
    filter.frequency.value = settings.fireFilter;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.052, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(filter);
    grit.connect(gritGain);
    gritGain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    grit.start();
    osc.stop(ctx.currentTime + 0.14);
    grit.stop(ctx.currentTime + 0.1);
  }

  playTagLaunch(): void {
    this.playFireLaunch();
  }

  playGunshot(): void {
    this.playFireLaunch();
  }

  playFireImpact(): void {
    const ctx = this.ensureContext();
    const bufferSize = Math.floor(ctx.sampleRate * 0.07);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.62 * Math.exp(-i / (bufferSize * 0.2));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1250;
    filter.Q.value = 1.2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + 0.12);
  }

  playTagImpact(): void {
    this.playFireImpact();
  }

  playExplosion(): void {
    const ctx = this.ensureContext();
    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + 0.4);
  }

  playHit(): void {
    this.playFireImpact();
  }

  destroy(): void {
    this.engineOsc1?.stop();
    this.engineOsc2?.stop();
    this.lfo?.stop();
    this.windNoise?.stop();
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
