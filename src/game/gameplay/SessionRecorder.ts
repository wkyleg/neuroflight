export interface FlightSample {
  t: number;
  speed: number;
  altitude: number;
  throttle: number;
  heading: number;
  calm: number;
  arousal: number;
  bpm: number | null;
  hrv: number | null;
  alpha: number;
  beta: number;
  theta: number;
  delta: number;
  gamma: number;
  calmnessState: string | null;
  respirationRate: number | null;
  alphaPeakFreq: number | null;
  score: number;
  combo: number;
  ringsPassed: number;
  playerHealth: number;
  aiHealth: number;
  kills: number;
  deaths: number;
}

export type FlightEventType = 'ring_hit' | 'kill' | 'death' | 'shot_fired' | 'shot_hit' | 'respawn';

export interface FlightEvent {
  t: number;
  type: FlightEventType;
}

const SAMPLE_INTERVAL = 1;

export class SessionRecorder {
  private samples: FlightSample[] = [];
  private events: FlightEvent[] = [];
  private sampleTimer = 0;
  private startTime = 0;
  private active = false;

  start(): void {
    this.samples = [];
    this.events = [];
    this.sampleTimer = 0;
    this.startTime = Date.now();
    this.active = true;
  }

  sample(dt: number, data: Omit<FlightSample, 't'>): void {
    if (!this.active) return;
    this.sampleTimer += dt;
    if (this.sampleTimer < SAMPLE_INTERVAL) return;
    this.sampleTimer -= SAMPLE_INTERVAL;

    this.samples.push({
      t: (Date.now() - this.startTime) / 1000,
      ...data,
    });
  }

  recordEvent(type: FlightEventType): void {
    if (!this.active) return;
    this.events.push({
      t: (Date.now() - this.startTime) / 1000,
      type,
    });
  }

  stop(): { samples: FlightSample[]; events: FlightEvent[] } {
    this.active = false;
    return { samples: this.samples, events: this.events };
  }

  reset(): void {
    this.samples = [];
    this.events = [];
    this.sampleTimer = 0;
    this.startTime = Date.now();
  }
}
