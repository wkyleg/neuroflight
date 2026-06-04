export interface TutorialStage {
  id: 'controls' | 'throttle' | 'gates' | 'route' | 'signal' | 'free_practice';
  title: string;
  prompt: string;
  startsAtMs: number;
}

export interface TutorialSnapshot extends TutorialStage {
  elapsedMs: number;
  progress: number;
  nextTitle: string | null;
}

const TUTORIAL_STAGES: TutorialStage[] = [
  {
    id: 'controls',
    title: 'Controls',
    prompt: 'Pitch with W/S, roll with A/D, and keep the nose near the horizon.',
    startsAtMs: 0,
  },
  {
    id: 'throttle',
    title: 'Throttle',
    prompt: 'Use Shift and Ctrl to find a comfortable cruising speed.',
    startsAtMs: 18_000,
  },
  {
    id: 'gates',
    title: 'Gates',
    prompt: 'Fly through the bright gates. Misses are fine; this run is not scored.',
    startsAtMs: 38_000,
  },
  {
    id: 'route',
    title: 'Route Cues',
    prompt: 'When a gate is offscreen, follow the route arrow back toward it.',
    startsAtMs: 68_000,
  },
  {
    id: 'signal',
    title: 'Camera Signal',
    prompt: 'Camera biofeedback is optional; steady framing only changes ambience.',
    startsAtMs: 96_000,
  },
  {
    id: 'free_practice',
    title: 'Free Practice',
    prompt: 'Practice turns, gates, and smooth recoveries for as long as you like.',
    startsAtMs: 126_000,
  },
];

export class TutorialDirector {
  snapshot(elapsedMs: number): TutorialSnapshot {
    const safeElapsedMs = Math.max(0, elapsedMs);
    const currentIndex = this.stageIndexAt(safeElapsedMs);
    const stage = TUTORIAL_STAGES[currentIndex];
    const nextStage = TUTORIAL_STAGES[currentIndex + 1] ?? null;
    const stageDurationMs = nextStage ? nextStage.startsAtMs - stage.startsAtMs : 1;
    const progress = nextStage ? Math.min(1, (safeElapsedMs - stage.startsAtMs) / stageDurationMs) : 1;

    return {
      ...stage,
      elapsedMs: safeElapsedMs - stage.startsAtMs,
      progress,
      nextTitle: nextStage?.title ?? null,
    };
  }

  reset(): void {
    // The director is stateless today; reset keeps the Game lifecycle explicit.
  }

  private stageIndexAt(elapsedMs: number): number {
    let index = 0;
    for (let i = 0; i < TUTORIAL_STAGES.length; i++) {
      if (elapsedMs >= TUTORIAL_STAGES[i].startsAtMs) index = i;
    }
    return index;
  }
}
