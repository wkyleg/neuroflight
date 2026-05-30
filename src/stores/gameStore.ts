import { create } from 'zustand';
import { DEFAULT_AIRCRAFT_ID } from '@/game/flight/AircraftRegistry.ts';
import type { Game } from '@/game/Game.ts';
import type { FlightEvent, FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import type { GameDifficulty, GameMode } from '@/game/types.ts';

export interface SessionSummary {
  mode: string;
  mapId: string;
  aircraftId: string;
  difficulty: GameDifficulty;
  durationMs: number;
  ringsPassed: number;
  score: number;
  bestCombo: number;
  averageSpeed: number;
  maxAltitude: number;
  minAltitude: number;
  totalDistance: number;
  neuroSource: string;
  kills: number;
  deaths: number;
  shotsFired: number;
  shotsHit: number;
  objectivesCompleted: number;
  objectiveGoal: number;
  scoreLabel: string;
  missionTitle: string;

  samples: FlightSample[];
  events: FlightEvent[];

  avgCalm: number | null;
  avgArousal: number | null;
  avgBpm: number | null;
  peakBpm: number | null;
  minBpm: number | null;
  avgHrv: number | null;
  avgAlpha: number | null;
  avgBeta: number | null;
  avgTheta: number | null;
  dominantBrainState: string | null;
  calmTrend: 'improved' | 'declined' | 'stable' | null;
  arousalTrend: 'increased' | 'decreased' | 'stable' | null;
  avgComposure: number | null;
  avgLoad: number | null;
  avgFlow: number | null;
  signalCoveragePct: number;
}

export interface FlightHudState {
  speed: number;
  altitude: number;
  heading: number;
  throttle: number;
  score: number;
  ringsHit: number;
  elapsedMs: number;
  mode: GameMode;
  paused: boolean;
  aircraftId: string;
  nextRingDir: { x: number; y: number } | null;
  playerHealth: number;
  aiHealth: number;
  kills: number;
  deaths: number;
  enemyDir: { x: number; y: number } | null;
  aiState: string;
  aiDistance: number;
  aiDotForward: number;
  shotsFired: number;
  shotsHit: number;
  missionTitle: string;
  missionSubtitle: string;
  objectiveLabel: string;
  objectiveText: string;
  objectiveSubtext: string;
  objectiveProgress: number;
  objectiveGoal: number;
  scoreLabel: string;
  nextObjectiveDir: { x: number; y: number } | null;
  composure: number;
  neuroLoad: number;
  recovery: number;
  flow: number;
  adaptationConfidence: number;
  signalCoverage: number;
  neuroPrompt: string;
}

interface GameStoreState {
  game: Game | null;
  hud: FlightHudState;
  lastSession: SessionSummary | null;

  setGame: (game: Game | null) => void;
  updateHud: (partial: Partial<FlightHudState>) => void;
  setLastSession: (session: SessionSummary) => void;
}

const DEFAULT_HUD: FlightHudState = {
  speed: 0,
  altitude: 0,
  heading: 0,
  throttle: 0.5,
  score: 0,
  ringsHit: 0,
  elapsedMs: 0,
  mode: 'zen',
  paused: false,
  aircraftId: DEFAULT_AIRCRAFT_ID,
  nextRingDir: null,
  playerHealth: 100,
  aiHealth: 100,
  kills: 0,
  deaths: 0,
  enemyDir: null,
  aiState: 'none',
  aiDistance: 0,
  aiDotForward: 0,
  shotsFired: 0,
  shotsHit: 0,
  missionTitle: 'Zen Flight',
  missionSubtitle: 'Route warming up',
  objectiveLabel: 'Rings',
  objectiveText: 'Find the next glowing gate',
  objectiveSubtext: 'Sensors optional',
  objectiveProgress: 0,
  objectiveGoal: 0,
  scoreLabel: 'Flow Score',
  nextObjectiveDir: null,
  composure: 0.5,
  neuroLoad: 0.35,
  recovery: 0.5,
  flow: 0.5,
  adaptationConfidence: 0,
  signalCoverage: 0,
  neuroPrompt: 'Signals optional',
};

function loadPersistedSession(): SessionSummary | null {
  try {
    const raw = sessionStorage.getItem('neuroflight_lastSession');
    if (raw) return JSON.parse(raw) as SessionSummary;
  } catch {
    /* ignore */
  }
  return null;
}

export const useGameStore = create<GameStoreState>((set) => ({
  game: null,
  hud: { ...DEFAULT_HUD },
  lastSession: loadPersistedSession(),

  setGame: (game) => set({ game }),
  updateHud: (partial) => set((s) => ({ hud: { ...s.hud, ...partial } })),
  setLastSession: (session) => {
    try {
      sessionStorage.setItem('neuroflight_lastSession', JSON.stringify(session));
    } catch {
      /* storage full — non-critical */
    }
    set({ lastSession: session });
  },
}));
