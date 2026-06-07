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
  const lowSignal = lastSession.insightConfidenceLabel === 'behavior_only' || lastSession.signalCoveragePct < 30;

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(94,234,212,0.12), transparent 38%), var(--color-bg-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col px-5 py-16 md:px-8">
        {/* ── HERO ── */}
        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: modeMeta.accent }}>
            {getModeTitle(lastSession.mode)} · {map.storyName ?? map.name} · {lastSession.difficulty.toUpperCase()}
          </p>
          <h1
            className="mt-2 text-5xl font-black tracking-wide md:text-6xl"
            style={{ fontFamily: 'var(--font-heading)', color: modeMeta.accent, lineHeight: 0.9 }}
          >
            Flight Debrief
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: 'rgba(240,236,224,0.74)' }}>
            {report.heroSummary}
          </p>
        </header>

        {/* ── RING METRICS ── */}
        <div className="mb-10 grid gap-5 sm:grid-cols-3">
          <RingMetric
            label="Session"
            value={report.sessionScore}
            color={modeMeta.accent}
            subtitle="Overall flight score"
            large
          />
          <RingMetric
            label="Focus"
            value={lastSession.focusScore}
            color="#facc15"
            subtitle="Waves — steadiness &amp; progress"
          />
          <RingMetric
            label="Calm"
            value={lastSession.recoveryBehaviorScore}
            color="#a7f3d0"
            subtitle="Recoveries — settling &amp; breathing"
          />
        </div>

        {/* ── REPORT CARDS ── */}
        <section className="mb-10">
          <SectionLabel>Performance breakdown</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {report.cards.map((card) => {
              const color = TONE_COLORS[card.tone];
              return (
                <article
                  key={card.id}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: `${color}33`,
                    background: `linear-gradient(145deg, ${color}0e, rgba(255,255,255,0.02))`,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${color}cc` }}>
                    {card.title}
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums" style={{ color }}>
                    {card.value}
                  </div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.66)' }}>
                    {card.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── COMBINED TIMELINE ── */}
        <section className="mb-10">
          <SectionLabel>Session state over time</SectionLabel>
          <div className="mt-3">
            <CombinedStateTimeline session={lastSession} />
          </div>
        </section>

        {/* ── QUICK STATS ── */}
        <section className="mb-10">
          <SectionLabel>At a glance</SectionLabel>
          <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatTile label="Flight Score" value={lastSession.score.toString()} color="#facc15" />
            <StatTile label="Duration" value={formatTime(lastSession.durationMs)} color="#5eead4" />
            <StatTile
              label="Completion"
              value={`${lastSession.objectivesCompleted}/${Math.max(1, lastSession.objectiveGoal)}`}
              color="#a7f3d0"
            />
            <StatTile
              label="Camera BPM"
              value={hasBpm ? Math.round(lastSession.avgBpm ?? 0).toString() : '--'}
              color="#fb7185"
              detail={
                hasBpm
                  ? `${Math.round(lastSession.minBpm ?? 0)}–${Math.round(lastSession.peakBpm ?? 0)} range`
                  : lowSignal
                    ? 'Behavior-based report'
                    : 'Signal not ready'
              }
            />
          </div>
        </section>

        {/* ── PHASE BREAKDOWN ── */}
        <section className="mb-10">
          <SectionLabel>Phase training breakdown</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {report.timeline.map((phase) => {
              const isRecovery = phase.targetLabel.includes('Calm');
              const phaseColor = isRecovery ? '#a7f3d0' : '#facc15';
              return (
                <div
                  key={phase.phase}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: `${phaseColor}22`,
                    background: `linear-gradient(145deg, ${phaseColor}08, rgba(255,255,255,0.02))`,
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: `${phaseColor}99` }}
                  >
                    {phase.targetLabel}
                  </div>
                  <div className="mt-1 text-sm font-bold" style={{ color: 'rgba(255,248,226,0.88)' }}>
                    {phase.label}
                  </div>
                  <div className="mt-2 text-3xl font-black tabular-nums" style={{ color: phaseColor }}>
                    {phase.targetScore}%
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${phase.targetScore}%`, background: phaseColor }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-4" style={{ color: 'rgba(240,236,224,0.58)' }}>
                    {phase.targetCopy}
                  </p>
                  {phase.recoveryTrend && (
                    <div className="mt-2 text-[10px] font-bold capitalize" style={{ color: '#a7f3d0' }}>
                      {phase.recoveryTrend}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RECOVERY WINDOWS ── */}
        {lastSession.recoveryWindows.length > 0 && (
          <section className="mb-10">
            <SectionLabel>Recovery windows</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {lastSession.recoveryWindows.map((window) => (
                <article
                  key={window.phase}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'rgba(167,243,208,0.2)',
                    background: 'linear-gradient(145deg, rgba(167,243,208,0.06), rgba(255,255,255,0.02))',
                  }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'rgba(167,243,208,0.7)' }}
                  >
                    Recovery
                  </div>
                  <div className="mt-1 text-sm font-bold" style={{ color: 'rgba(255,248,226,0.88)' }}>
                    {window.label}
                  </div>
                  <div className="mt-2 text-2xl font-black capitalize" style={{ color: '#a7f3d0' }}>
                    {window.trendLabel}
                  </div>
                  <p className="mt-2 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.62)' }}>
                    {window.bpmDelta !== null
                      ? `Camera BPM moved ${window.bpmDelta > 0 ? '+' : ''}${window.bpmDelta} during this window.`
                      : 'Signal not strong enough for a BPM trend here.'}
                  </p>
                  <div className="mt-2 text-[10px]" style={{ color: 'rgba(240,236,224,0.42)' }}>
                    Coverage {Math.round(window.signalCoverage * 100)}%
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── ADVANCED CHARTS ── */}
        <section className="mb-10">
          <SectionLabel>Advanced telemetry</SectionLabel>
          <div className="mt-3">
            <ReportCharts session={lastSession} />
          </div>
        </section>

        {/* ── NEXT STEP ── */}
        <section
          className="mb-10 rounded-xl border p-6"
          style={{
            borderColor: 'rgba(167,243,208,0.24)',
            background: 'linear-gradient(145deg, rgba(167,243,208,0.06), rgba(255,255,255,0.02))',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#a7f3d0' }}>
            Next step
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.78)' }}>
            {report.nextStep}
          </p>
        </section>

        {/* ── ACTIONS ── */}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/')} className="glass-button rounded-xl px-8 py-4">
            Menu
          </button>
          <button
            type="button"
            onClick={() => navigate(flyAgainUrl)}
            className="glass-button rounded-xl px-8 py-4 font-black"
            style={{ color: modeMeta.accent }}
          >
            Fly Again
          </button>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(240,236,224,0.46)' }}>
      {children}
    </h2>
  );
}

function RingMetric({
  label,
  value,
  color,
  subtitle,
  large = false,
}: {
  label: string;
  value: number;
  color: string;
  subtitle: string;
  large?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const outerSize = large ? 168 : 152;
  const innerSize = large ? 130 : 116;
  const ringWidth = (outerSize - innerSize) / 2;
  const scoreSize = large ? 'text-4xl' : 'text-3xl';

  return (
    <article
      className="flex flex-col items-center rounded-2xl border p-6 text-center"
      style={{
        borderColor: `${color}22`,
        background: `radial-gradient(ellipse at 50% 0%, ${color}10, transparent 60%), rgba(255,255,255,0.025)`,
      }}
    >
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: outerSize,
          height: outerSize,
          background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
          boxShadow: `0 0 ${ringWidth * 3}px ${color}44`,
        }}
      >
        <div
          className="grid place-items-center rounded-full"
          style={{ width: innerSize, height: innerSize, background: '#071016' }}
        >
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(240,236,224,0.52)' }}
            >
              {label}
            </div>
            <div className={`mt-0.5 font-black tabular-nums ${scoreSize}`} style={{ color, lineHeight: 1 }}>
              {clamped}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.58)' }}>
        {subtitle}
      </p>
    </article>
  );
}

function StatTile({ label, value, color, detail }: { label: string; value: string; color: string; detail?: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `${color}22`,
        background: `linear-gradient(145deg, ${color}08, rgba(255,255,255,0.02))`,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.48)' }}>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      {detail && (
        <div className="mt-1 text-[10px]" style={{ color: 'rgba(240,236,224,0.46)' }}>
          {detail}
        </div>
      )}
    </div>
  );
}
