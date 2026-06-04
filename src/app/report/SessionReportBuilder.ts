import { SESSION_PHASES, type SessionPhase, sessionPhaseLabel } from '@/game/session/sessionTypes.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';

export type ReportCardTone = 'focus' | 'control' | 'pressure' | 'recovery' | 'signal';

export interface ReportCard {
  id: string;
  title: string;
  value: string;
  body: string;
  tone: ReportCardTone;
}

export interface ReportPhaseSummary {
  phase: SessionPhase;
  label: string;
  eventCount: number;
  signalLabel: string;
  recoveryTrend: string | null;
}

export interface NeuroFlightReport {
  sessionId: string;
  mode: string;
  difficulty: string;
  durationMs: number;
  sessionScore: number;
  insightConfidence: string;
  heroSummary: string;
  nextStep: string;
  cards: ReportCard[];
  timeline: ReportPhaseSummary[];
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function scoreBody(score: number, strong: string, soft: string): string {
  return score >= 75 ? strong : soft;
}

function signalCopy(session: SessionSummary): { value: string; body: string; confidence: string } {
  const coverage = Math.round(session.signalCoveragePct);
  const confidence = session.insightConfidenceLabel.replace(/_/g, '-');
  if (session.insightConfidenceLabel === 'behavior_only') {
    return {
      value: 'Behavior-only',
      confidence,
      body: 'Camera signal was unavailable or too limited, so pulse-trend insight is omitted.',
    };
  }
  return {
    value: pct(coverage),
    confidence,
    body: `Camera signal coverage was ${coverage}%, enough for ${confidence} recovery insight.`,
  };
}

export class SessionReportBuilder {
  static build(session: SessionSummary): NeuroFlightReport {
    const signal = signalCopy(session);
    const recoveryTrend = session.recoveryWindows.at(-1)?.trendLabel ?? 'unclear';
    const heroSummary =
      signal.value === 'Behavior-only'
        ? `Session Score ${session.sessionScore}. You completed the run with a behavior-only report.`
        : `Session Score ${session.sessionScore}. Camera signal was ${signal.confidence} for recovery insight.`;

    return {
      sessionId: `${session.mode}-${session.durationMs}-${session.score}`,
      mode: session.mode,
      difficulty: session.difficulty,
      durationMs: session.durationMs,
      sessionScore: session.sessionScore,
      insightConfidence: signal.confidence,
      heroSummary,
      nextStep: SessionReportBuilder.nextStep(session, recoveryTrend),
      cards: [
        {
          id: 'focus',
          title: 'Focus',
          value: pct(session.focusScore),
          body: scoreBody(
            session.focusScore,
            'You stayed on task through the main route objectives.',
            'Replay the route and aim for cleaner objective chains.',
          ),
          tone: 'focus',
        },
        {
          id: 'control',
          title: 'Control',
          value: pct(session.controlScore),
          body: scoreBody(
            session.controlScore,
            'Your speed, altitude, and throttle stayed relatively steady.',
            'Use wider turns and smaller throttle changes next run.',
          ),
          tone: 'control',
        },
        {
          id: 'pressure',
          title: 'Pressure',
          value: pct(session.pressureScore),
          body: scoreBody(
            session.pressureScore,
            'You held performance into the final wave.',
            'Treat the final wave as a smooth accuracy check.',
          ),
          tone: 'pressure',
        },
        {
          id: 'recovery',
          title: 'Recovery',
          value: pct(session.recoveryBehaviorScore),
          body:
            recoveryTrend === 'unclear'
              ? 'Recovery windows are scored from steady flight behavior; camera trend was not strong enough to summarize.'
              : `Final recovery camera-estimated pulse trend was ${recoveryTrend}.`,
          tone: 'recovery',
        },
        {
          id: 'signal',
          title: 'Signal Quality',
          value: signal.value,
          body: signal.body,
          tone: 'signal',
        },
      ],
      timeline: SessionReportBuilder.timeline(session),
    };
  }

  private static timeline(session: SessionSummary): ReportPhaseSummary[] {
    return SESSION_PHASES.filter((phase) => phase !== 'readiness' && phase !== 'debrief').map((phase) => {
      const samples = session.samples.filter((sample) => sample.phase === phase);
      const events = session.events.filter((event) => event.phase === phase);
      const recovery = session.recoveryWindows.find((window) => window.phase === phase);
      const coverage = samples.length > 0 ? samples.filter((sample) => sample.canPublish).length / samples.length : 0;
      const signalLabel =
        coverage >= 0.8 ? 'Strong' : coverage >= 0.6 ? 'Partial' : coverage >= 0.3 ? 'Weak' : 'Behavior-only';
      return {
        phase,
        label: sessionPhaseLabel(phase),
        eventCount: events.length,
        signalLabel,
        recoveryTrend: recovery?.trendLabel ?? null,
      };
    });
  }

  private static nextStep(session: SessionSummary, recoveryTrend: string): string {
    if (session.sessionScore >= 82 && session.difficulty !== 'ace') return 'Try the same route one difficulty higher.';
    if (session.controlScore < 62) return 'Replay this route and prioritize smooth throttle and wide turns.';
    if (recoveryTrend === 'elevated') return 'Use the recovery windows as steady glide segments before pushing again.';
    if (session.insightConfidenceLabel === 'behavior_only')
      return 'Try camera biofeedback next time if you want recovery insight.';
    return 'Replay the same route and try to lift your final-wave score.';
  }
}
