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
  objectivesCompleted: number;
  objectiveProgress: number;
  composure: number;
  neuroLoad: number;
  recovery: number;
  flow: number;
  adaptationConfidence: number;
  signalCoverage: number;
  playerHealth: number;
  aiHealth: number;
  kills: number;
  deaths: number;
}

export type FlightEventType =
  | 'ring_hit'
  | 'objective_complete'
  | 'landmark_discovered'
  | 'postcard'
  | 'near_miss'
  | 'hard_landing'
  | 'crash'
  | 'neuro_recovery'
  | 'kill'
  | 'death'
  | 'shot_fired'
  | 'shot_hit'
  | 'respawn';

export interface FlightEvent {
  t: number;
  type: FlightEventType;
  label?: string;
  score?: number;
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

  recordEvent(type: FlightEventType, detail?: { label?: string; score?: number }): void {
    if (!this.active) return;
    this.events.push({
      t: (Date.now() - this.startTime) / 1000,
      type,
      ...detail,
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
