import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ReportCharts } from '@/app/report/ReportCharts.tsx';
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(94,234,212,0.14), transparent 34%), var(--color-bg-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-24">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'rgba(240,236,224,0.58)' }}>
            {getModeTitle(lastSession.mode)} · {map.storyName ?? map.name} · {lastSession.difficulty.toUpperCase()}
          </p>
          <h1
            className="mt-3 text-4xl font-black tracking-wide"
            style={{ color: modeMeta.accent, fontFamily: 'var(--font-heading)' }}
          >
            Session Score {report.sessionScore}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: 'rgba(240,236,224,0.76)' }}>
            {report.heroSummary}
          </p>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
              Flight Score
            </div>
            <div className="mt-2 text-3xl font-black" style={{ color: '#facc15' }}>
              {lastSession.score}
            </div>
          </div>
          <div className="rounded-lg border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
              Duration
            </div>
            <div className="mt-2 text-3xl font-black" style={{ color: '#5eead4' }}>
              {formatTime(lastSession.durationMs)}
            </div>
          </div>
          <div className="rounded-lg border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
              Progress
            </div>
            <div className="mt-2 text-3xl font-black" style={{ color: '#a7f3d0' }}>
              {lastSession.objectivesCompleted}/{Math.max(1, lastSession.objectiveGoal)}
            </div>
          </div>
          <div className="rounded-lg border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
              Insight
            </div>
            <div className="mt-2 text-3xl font-black capitalize" style={{ color: '#93c5fd' }}>
              {report.insightConfidence}
            </div>
          </div>
          <div className="rounded-lg border p-5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
              Camera BPM
            </div>
            <div className="mt-2 text-3xl font-black" style={{ color: '#fb7185' }}>
              {hasBpm ? Math.round(lastSession.avgBpm ?? 0) : '--'}
            </div>
            <div className="mt-1 text-[10px]" style={{ color: 'rgba(240,236,224,0.52)' }}>
              {hasBpm
                ? `${Math.round(lastSession.minBpm ?? 0)}-${Math.round(lastSession.peakBpm ?? 0)} range`
                : 'Unavailable'}
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-5">
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

        <section className="mb-10">
          <h2 className="mb-4 text-xs uppercase tracking-[0.22em]" style={{ color: '#5eead4' }}>
            Phase Timeline
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
                <div className="mt-2 text-xs" style={{ color: 'rgba(240,236,224,0.62)' }}>
                  {phase.eventCount} events · {phase.signalLabel}
                </div>
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
                      width: `${Math.round(Math.max(phase.objectiveProgress, phase.avgScore / Math.max(1, lastSession.score)) * 100)}%`,
                      background: modeMeta.accent,
                    }}
                  />
                </div>
                <div className="mt-2 text-[10px]" style={{ color: 'rgba(240,236,224,0.48)' }}>
                  Avg speed {phase.avgSpeed || '--'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {lastSession.recoveryWindows.length > 0 && (
          <section className="mb-10">
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

        <section className="mb-10 rounded-lg border p-6" style={{ borderColor: 'rgba(167,243,208,0.28)' }}>
          <div className="text-xs uppercase tracking-[0.22em]" style={{ color: '#a7f3d0' }}>
            Next Step
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.76)' }}>
            {report.nextStep}
          </p>
        </section>

        <section className="mb-10">
          <button
            type="button"
            className="glass-button rounded-lg px-5 py-3 text-xs font-bold tracking-widest"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            {advancedOpen ? 'Hide Advanced Telemetry' : 'Show Advanced Telemetry'}
          </button>
          {advancedOpen && (
            <div className="mt-4">
              <ReportCharts session={lastSession} />
            </div>
          )}
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
