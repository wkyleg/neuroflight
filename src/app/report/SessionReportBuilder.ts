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
  targetLabel: string;
  targetScore: number;
  targetSource: 'camera-assisted' | 'behavior-based';
  targetCopy: string;
  focusProxy: number;
  calmProxy: number;
  recoveryTrend: string | null;
  sampleCount: number;
  avgScore: number;
  avgSpeed: number;
  objectiveProgress: number;
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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function focusProxy(sample: SessionSummary['samples'][number]): number {
  const routeProgress = clamp01(sample.objectiveProgress);
  const combo = clamp01(sample.combo / 8);
  const cameraAssist = sample.canPublish
    ? sample.flow * 0.5 + sample.composure * 0.32 + (1 - sample.neuroLoad) * 0.18
    : 0;
  const behavior = routeProgress * 0.44 + combo * 0.22 + sample.flow * 0.2 + sample.composure * 0.14;
  return clampScore((sample.canPublish ? cameraAssist * 0.68 + behavior * 0.32 : behavior) * 100);
}

function calmProxy(sample: SessionSummary['samples'][number]): number {
  const stableThrottle = 1 - Math.min(1, Math.abs(sample.throttle - 0.58) / 0.58);
  const cameraAssist = sample.canPublish ? sample.recovery * 0.48 + sample.calm * 0.34 + sample.composure * 0.18 : 0;
  const behavior =
    sample.composure * 0.42 + (1 - sample.neuroLoad) * 0.3 + stableThrottle * 0.16 + sample.recovery * 0.12;
  return clampScore((sample.canPublish ? cameraAssist * 0.7 + behavior * 0.3 : behavior) * 100);
}

function isRecoveryPhase(phase: SessionPhase): boolean {
  return phase === 'recovery_1' || phase === 'final_recovery';
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
    const timeline = SessionReportBuilder.timeline(session);
    const avgTarget =
      timeline.length > 0
        ? average(timeline.filter((phase) => phase.sampleCount > 0).map((phase) => phase.targetScore))
        : 0;
    const bestPhase = timeline
      .filter((phase) => phase.sampleCount > 0)
      .sort((a, b) => b.objectiveProgress - a.objectiveProgress || b.avgScore - a.avgScore)[0];
    const finalWave = timeline.find((phase) => phase.phase === 'final_wave');
    const heroSummary =
      signal.value === 'Behavior-only'
        ? `Session Score ${session.sessionScore}. Your strongest phase was ${bestPhase?.label ?? 'the main route'}, and the report stays behavior-only.`
        : `Session Score ${session.sessionScore}. Camera signal was ${signal.confidence}, with ${bestPhase?.label ?? 'the route'} carrying the clearest progress.`;

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
          value: pct(session.focusScore || avgTarget),
          body: scoreBody(
            session.focusScore,
            `You stayed on task through ${session.objectivesCompleted}/${Math.max(1, session.objectiveGoal)} objectives.`,
            `You completed ${session.objectivesCompleted}/${Math.max(1, session.objectiveGoal)} objectives; replay for cleaner chains.`,
          ),
          tone: 'focus',
        },
        {
          id: 'control',
          title: 'Control',
          value: pct(session.controlScore),
          body: scoreBody(
            session.controlScore,
            `Average speed was ${Math.round(session.averageSpeed)} with a ${Math.round(session.maxAltitude - session.minAltitude)} ft altitude band.`,
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
            finalWave
              ? `Final wave reached ${Math.round(finalWave.objectiveProgress * 100)}% route progress.`
              : 'You held performance into the final wave.',
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
      timeline,
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
      const phaseFocus = clampScore(average(samples.map((sample) => focusProxy(sample))));
      const phaseCalm = clampScore(average(samples.map((sample) => calmProxy(sample))));
      const recoveryPhase = isRecoveryPhase(phase);
      const sampleBackedScore = recoveryPhase
        ? recovery
          ? Math.round((recovery.behaviorScore + phaseCalm) / 2)
          : phaseCalm
        : phaseFocus;
      const targetScore =
        samples.length > 0 ? sampleBackedScore : recoveryPhase ? session.recoveryBehaviorScore : session.focusScore;
      const targetSource = coverage >= 0.45 ? 'camera-assisted' : 'behavior-based';
      const targetLabel = recoveryPhase ? 'Calm practice' : 'Focus practice';
      const targetCopy =
        samples.length === 0
          ? `${targetLabel} uses the session-level behavior score because this phase had no saved samples.`
          : targetScore >= 76
            ? `${targetLabel} was steady here, based on ${targetSource} signals.`
            : `${targetLabel} has room to rise here; use smoother corrections next run.`;
      return {
        phase,
        label: sessionPhaseLabel(phase),
        eventCount: events.length,
        signalLabel,
        targetLabel,
        targetScore,
        targetSource,
        targetCopy,
        focusProxy: phaseFocus,
        calmProxy: phaseCalm,
        recoveryTrend: recovery?.trendLabel ?? null,
        sampleCount: samples.length,
        avgScore: Math.round(average(samples.map((sample) => sample.score))),
        avgSpeed: Math.round(average(samples.map((sample) => sample.speed))),
        objectiveProgress: Math.max(0, ...samples.map((sample) => sample.objectiveProgress)),
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
