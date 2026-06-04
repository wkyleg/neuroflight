import type { SessionPhase } from '@/game/session/sessionTypes.ts';
import type { RppgSignalStatus } from '@/neuro/rppgSignalTypes.ts';

export interface FlightSample {
  t: number;
  phase: SessionPhase;
  rppgStatus: RppgSignalStatus;
  canPublish: boolean;
  signalCoverageTrailing: number;
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
  | 'session_started'
  | 'session_completed'
  | 'session_ended_early'
  | 'phase_started'
  | 'phase_completed'
  | 'recovery_started'
  | 'recovery_completed'
  | 'signal_ready'
  | 'signal_lost'
  | 'signal_recovered'
  | 'camera_permission_denied'
  | 'backend_unavailable'
  | 'ring_hit'
  | 'route_complete'
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
  | 'ufo_bonus'
  | 'respawn';

export interface FlightEvent {
  t: number;
  type: FlightEventType;
  phase: SessionPhase;
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
  private currentPhase: SessionPhase = 'readiness';

  start(): void {
    this.samples = [];
    this.events = [];
    this.sampleTimer = 0;
    this.startTime = Date.now();
    this.active = true;
    this.currentPhase = 'readiness';
  }

  setPhase(phase: SessionPhase): void {
    this.currentPhase = phase;
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

  recordEvent(type: FlightEventType, detail?: { label?: string; score?: number; phase?: SessionPhase }): void {
    if (!this.active) return;
    this.events.push({
      t: (Date.now() - this.startTime) / 1000,
      type,
      phase: detail?.phase ?? this.currentPhase,
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
    this.currentPhase = 'readiness';
  }
}
