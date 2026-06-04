import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { CombinedStateTimeline, ReportCharts } from '@/app/report/ReportCharts.tsx';
import { type ReportCardTone, SessionReportBuilder } from '@/app/report/SessionReportBuilder.ts';
import { getModeMeta, getModeTitle } from '@/game/modes.ts';
import { getMap } from '@/game/world/MapRegistry.ts';
import { useGameStore } from '@/stores/gameStore.ts';

const TONE_COLORS: Record<ReportCardTone, string> = {
  focus: '#facc15',
  control: '#5eead4',
  pressure: '#fb7185',
  recovery: '#a7f3d0',
  signal: '#93c5fd',
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

export function SummaryScreen() {
  const navigate = useNavigate();
  const lastSession = useGameStore((state) => state.lastSession);
  const report = useMemo(() => (lastSession ? SessionReportBuilder.build(lastSession) : null), [lastSession]);

  if (!lastSession || !report) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <p className="mb-8 text-lg tracking-wide" style={{ fontFamily: 'var(--font-heading)', color: '#5eead4' }}>
          NO FLIGHT DATA
        </p>
        <button type="button" onClick={() => navigate('/')} className="glass-button rounded-lg px-10 py-4">
          MENU
        </button>
      </div>
    );
  }

  const map = getMap(lastSession.mapId);
  const modeMeta = getModeMeta(lastSession.mode as 'zen' | 'free' | 'dogfight');
  const flyAgainUrl = `/fly?mode=${lastSession.mode}&map=${lastSession.mapId}&aircraft=${lastSession.aircraftId}&difficulty=${lastSession.difficulty}`;
  const hasBpm = lastSession.avgBpm !== null && lastSession.signalCoveragePct > 0;
  const focusRing = report.cards.find((card) => card.id === 'focus')?.body ?? 'Focus practice summary unavailable.';
  const recoveryRing =
    report.cards.find((card) => card.id === 'recovery')?.body ?? 'Recovery practice summary unavailable.';
  const lowSignal = lastSession.insightConfidenceLabel === 'behavior_only' || lastSession.signalCoveragePct < 30;
  const trainingNote = lowSignal
    ? 'Camera coverage was limited, so focus and calm are behavior-based training proxies from flight smoothness, route progress, and recovery control.'
    : 'Focus and calm combine camera-assisted trends with flight behavior, while weak-signal moments stay out of pulse-trend insight.';

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(94,234,212,0.14), transparent 34%), var(--color-bg-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-20">
        <header
          className="grid gap-6 rounded-lg border p-6 md:grid-cols-[1fr_1.5fr]"
          style={{
            borderColor: 'rgba(255,255,255,0.12)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.075), rgba(6,20,28,0.52))',
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'rgba(240,236,224,0.58)' }}>
              {getModeTitle(lastSession.mode)} · {map.storyName ?? map.name} · {lastSession.difficulty.toUpperCase()}
            </p>
            <h1
              className="mt-3 text-5xl tracking-wide"
              style={{ color: modeMeta.accent, fontFamily: 'var(--font-heading)', lineHeight: 0.92 }}
            >
              Flight Debrief
            </h1>
            <p className="mt-4 text-sm leading-7" style={{ color: 'rgba(240,236,224,0.76)' }}>
              {report.heroSummary}
            </p>
            <p className="mt-3 text-xs leading-6" style={{ color: lowSignal ? '#93c5fd' : 'rgba(240,236,224,0.6)' }}>
              {trainingNote}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <RingMetric
              label="Session"
              value={report.sessionScore}
              color={modeMeta.accent}
              copy="Overall flight score"
            />
            <RingMetric label="Focus" value={lastSession.focusScore} color="#facc15" copy={focusRing} />
            <RingMetric label="Calm" value={lastSession.recoveryBehaviorScore} color="#a7f3d0" copy={recoveryRing} />
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          {report.cards.map((card) => {
            const color = TONE_COLORS[card.tone];
            return (
              <article
                key={card.id}
                className="rounded-lg border p-5"
                style={{
                  borderColor: `${color}44`,
                  background: `linear-gradient(135deg, ${color}12, rgba(255,255,255,0.025))`,
                }}
              >
                <div className="text-[10px] uppercase tracking-widest" style={{ color: `${color}dd` }}>
                  {card.title}
                </div>
                <div className="mt-3 text-2xl font-black" style={{ color }}>
                  {card.value}
                </div>
                <p className="mt-3 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.7)' }}>
                  {card.body}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <CombinedStateTimeline session={lastSession} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard label="Flight Score" value={lastSession.score.toString()} color="#facc15" />
            <StatCard label="Duration" value={formatTime(lastSession.durationMs)} color="#5eead4" />
            <StatCard
              label="Progress"
              value={`${lastSession.objectivesCompleted}/${Math.max(1, lastSession.objectiveGoal)}`}
              color="#a7f3d0"
            />
            <StatCard
              label="Camera BPM"
              value={hasBpm ? Math.round(lastSession.avgBpm ?? 0).toString() : '--'}
              color="#fb7185"
              detail={
                hasBpm
                  ? `${Math.round(lastSession.minBpm ?? 0)}-${Math.round(lastSession.peakBpm ?? 0)} range`
                  : 'Behavior-based report'
              }
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs uppercase tracking-[0.22em]" style={{ color: '#5eead4' }}>
            Phase Training Breakdown
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            {report.timeline.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-lg border p-4"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <div className="text-sm font-bold" style={{ color: 'rgba(255,248,226,0.9)' }}>
                  {phase.label}
                </div>
                <div
                  className="mt-2 text-2xl font-black"
                  style={{ color: phase.targetLabel.includes('Calm') ? '#a7f3d0' : '#facc15' }}
                >
                  {phase.targetScore}%
                </div>
                <div className="mt-2 text-xs" style={{ color: 'rgba(240,236,224,0.62)' }}>
                  {phase.targetLabel} · {phase.targetSource}
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.7)' }}>
                  {phase.targetCopy}
                </p>
                {phase.recoveryTrend && (
                  <div className="mt-2 text-xs capitalize" style={{ color: '#a7f3d0' }}>
                    {phase.recoveryTrend}
                  </div>
                )}
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${phase.targetScore}%`,
                      background: modeMeta.accent,
                    }}
                  />
                </div>
                <div className="mt-2 text-[10px]" style={{ color: 'rgba(240,236,224,0.48)' }}>
                  {phase.eventCount} events · {phase.signalLabel} signal · Avg speed {phase.avgSpeed || '--'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {lastSession.recoveryWindows.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs uppercase tracking-[0.22em]" style={{ color: '#a7f3d0' }}>
              Recovery Detail
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {lastSession.recoveryWindows.map((window) => (
                <article
                  key={window.phase}
                  className="rounded-lg border p-4"
                  style={{ borderColor: 'rgba(167,243,208,0.22)' }}
                >
                  <div className="text-sm font-bold" style={{ color: 'rgba(255,248,226,0.9)' }}>
                    {window.label}
                  </div>
                  <div className="mt-2 text-2xl font-black capitalize" style={{ color: '#a7f3d0' }}>
                    {window.trendLabel}
                  </div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.66)' }}>
                    {window.bpmDelta !== null
                      ? `Camera-estimated BPM moved ${window.bpmDelta > 0 ? '+' : ''}${window.bpmDelta} during this recovery.`
                      : 'Camera signal was not strong enough for a BPM trend here.'}
                  </p>
                  <div className="mt-2 text-[10px]" style={{ color: 'rgba(240,236,224,0.48)' }}>
                    Signal coverage {Math.round(window.signalCoverage * 100)}%
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section>
          <ReportCharts session={lastSession} />
        </section>

        <section className="rounded-lg border p-6" style={{ borderColor: 'rgba(167,243,208,0.28)' }}>
          <div className="text-xs uppercase tracking-[0.22em]" style={{ color: '#a7f3d0' }}>
            Next Step
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.76)' }}>
            {report.nextStep}
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/')} className="glass-button rounded-lg px-8 py-4">
            Menu
          </button>
          <button type="button" onClick={() => navigate(flyAgainUrl)} className="glass-button rounded-lg px-8 py-4">
            Fly Again
          </button>
        </div>
      </main>
    </div>
  );
}

function RingMetric({ label, value, color, copy }: { label: string; value: number; color: string; copy: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <article className="rounded-lg border p-4 text-center" style={{ borderColor: `${color}44` }}>
      <div
        className="mx-auto grid h-36 w-36 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(255,255,255,0.09) 0deg)`,
        }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: '#08141c' }}>
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(240,236,224,0.58)' }}
            >
              {label}
            </div>
            <div className="mt-1 text-3xl font-black" style={{ color }}>
              {clamped}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.66)' }}>
        {copy}
      </p>
    </article>
  );
}

function StatCard({ label, value, color, detail }: { label: string; value: string; color: string; detail?: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
        {label}
      </div>
      <div className="mt-2 text-3xl font-black" style={{ color }}>
        {value}
      </div>
      {detail && (
        <div className="mt-1 text-[10px]" style={{ color: 'rgba(240,236,224,0.52)' }}>
          {detail}
        </div>
      )}
    </div>
  );
}
