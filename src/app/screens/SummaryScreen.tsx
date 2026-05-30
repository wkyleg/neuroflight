import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FlightEvent, FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import { getModeMeta, getModeTitle } from '@/game/modes.ts';
import { getMap } from '@/game/world/MapRegistry.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';
import { useGameStore } from '@/stores/gameStore.ts';

/* ─── Shared styling constants ─── */

const COLORS = {
  cyan: '#00cccc',
  gold: '#ffcc44',
  red: '#ff4444',
  green: '#44dd88',
  magenta: '#ff44aa',
  orange: '#ff8844',
  yellow: '#ffff44',
  blue: '#4488ff',
  text: 'rgba(255,255,255,0.7)',
  textDim: 'rgba(255,255,255,0.4)',
  gridLine: 'rgba(0,204,204,0.08)',
  axisStroke: 'rgba(0,204,204,0.2)',
};

const axisTick = { fill: COLORS.textDim, fontSize: 10, fontFamily: 'var(--font-mono)' };

const tooltipStyle = {
  background: 'rgba(0,5,15,0.95)',
  border: '1px solid rgba(0,204,204,0.3)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: COLORS.cyan,
};

/* ─── Reusable components ─── */

function StatBox({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      className="rounded-xl"
      style={{
        border: `1px solid ${color}30`,
        background: `${color}08`,
        padding: '24px 28px',
      }}
    >
      <span
        className="tracking-[0.2em] uppercase block"
        style={{ fontFamily: 'var(--font-mono)', color: `${color}90`, fontSize: 10, marginBottom: 8 }}
      >
        {label}
      </span>
      <span className="font-bold tabular-nums block" style={{ fontFamily: 'var(--font-heading)', color, fontSize: 22 }}>
        {value}
      </span>
      {sub && (
        <span className="tracking-wider block" style={{ color: `${color}60`, fontSize: 10, marginTop: 6 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function SectionHeading({ title, color }: { title: string; color: string }) {
  return (
    <h2
      className="tracking-[0.25em] uppercase w-full max-w-4xl"
      style={{
        fontFamily: 'var(--font-heading)',
        color,
        borderBottom: `1px solid ${color}20`,
        paddingBottom: 16,
        marginBottom: 32,
        marginTop: 24,
        fontSize: 14,
      }}
    >
      {title}
    </h2>
  );
}

function ChartContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl"
      style={{ border: '1px solid rgba(0,204,204,0.12)', background: 'rgba(0,204,204,0.02)', padding: '32px 36px' }}
    >
      <h3
        className="tracking-[0.2em] uppercase"
        style={{ fontFamily: 'var(--font-heading)', color: COLORS.cyan, fontSize: 13, marginBottom: 24 }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── Data processing helpers ─── */

function buildFlightTimeline(samples: FlightSample[]) {
  return samples.map((s) => ({
    time: Math.round(s.t),
    altitude: s.altitude,
    speed: s.speed,
    throttle: Math.round(s.throttle * 100),
    heading: s.heading,
  }));
}

function buildNeuralTimeline(samples: FlightSample[]) {
  return samples.map((s) => ({
    time: Math.round(s.t),
    calm: +(s.calm * 100).toFixed(0),
    arousal: +(s.arousal * 100).toFixed(0),
  }));
}

function buildBpmTimeline(samples: FlightSample[]) {
  return samples
    .filter((s) => s.bpm !== null)
    .map((s) => ({
      time: Math.round(s.t),
      bpm: Math.round(s.bpm ?? 0),
      hrv: s.hrv !== null ? Math.round(s.hrv) : undefined,
    }));
}

function buildEegTimeline(samples: FlightSample[]) {
  return samples
    .filter((s) => s.alpha > 0 || s.beta > 0 || s.theta > 0)
    .map((s) => ({
      time: Math.round(s.t),
      alpha: +s.alpha.toFixed(3),
      beta: +s.beta.toFixed(3),
      theta: +s.theta.toFixed(3),
      delta: +s.delta.toFixed(3),
      gamma: +s.gamma.toFixed(3),
    }));
}

function buildAlphaPeakTimeline(samples: FlightSample[]) {
  return samples
    .filter((s) => s.alphaPeakFreq != null)
    .map((s) => ({
      time: Math.round(s.t),
      freq: +(s.alphaPeakFreq ?? 0).toFixed(1),
    }));
}

function buildRespirationTimeline(samples: FlightSample[]) {
  return samples
    .filter((s) => s.respirationRate != null)
    .map((s) => ({
      time: Math.round(s.t),
      rate: +(s.respirationRate ?? 0).toFixed(1),
    }));
}

function buildCognitiveLoadTimeline(samples: FlightSample[]) {
  return samples
    .filter((s) => s.alpha > 0)
    .map((s) => ({
      time: Math.round(s.t),
      load: s.alpha > 0 ? +(s.beta / s.alpha).toFixed(2) : 0,
    }));
}

function buildStressVsAltitudeScatter(samples: FlightSample[]) {
  if (samples.length < 3) return [];
  const altStability: Array<{ calm: number; stability: number }> = [];
  for (let i = 2; i < samples.length; i++) {
    const altDelta =
      Math.abs(samples[i].altitude - samples[i - 1].altitude) +
      Math.abs(samples[i - 1].altitude - samples[i - 2].altitude);
    altStability.push({
      calm: Math.round(samples[i].calm * 100),
      stability: Math.round(Math.max(0, 100 - altDelta)),
    });
  }
  return altStability;
}

function mean(values: Array<number | undefined>): number | null {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function buildPhaseBreakdown(samples: FlightSample[]) {
  if (samples.length < 3) return [];
  const duration = samples[samples.length - 1].t || 1;
  return ['Opening', 'Mid Flight', 'Final Approach'].map((label, index) => {
    const start = (duration / 3) * index;
    const end = index === 2 ? duration + 0.01 : (duration / 3) * (index + 1);
    const slice = samples.filter((s) => s.t >= start && s.t < end);
    return {
      label,
      calm: mean(slice.map((s) => s.calm)),
      arousal: mean(slice.map((s) => s.arousal)),
      composure: mean(slice.map((s) => s.composure)),
      flow: mean(slice.map((s) => s.flow)),
      avgSpeed: mean(slice.map((s) => s.speed)),
      rings: slice.at(-1)?.ringsPassed ?? 0,
      objectives: slice.at(-1)?.objectivesCompleted ?? 0,
    };
  });
}

function buildEventWindows(samples: FlightSample[], events: FlightEvent[]) {
  return events.slice(-10).map((event) => {
    const nearby = samples.filter((sample) => Math.abs(sample.t - event.t) <= 2);
    return {
      time: Math.round(event.t),
      label: event.label ?? event.type.replace(/_/g, ' '),
      type: event.type,
      calm: mean(nearby.map((s) => s.calm)),
      load: mean(nearby.map((s) => s.neuroLoad)),
      flow: mean(nearby.map((s) => s.flow)),
      score: event.score,
    };
  });
}

function buildNotableMoments(samples: FlightSample[], events: FlightEvent[]) {
  const moments: Array<{ time: number; title: string; detail: string }> = [];
  for (const event of events) {
    if (event.type === 'postcard' || event.type === 'objective_complete' || event.type === 'kill') {
      moments.push({
        time: Math.round(event.t),
        title: event.label ?? event.type.replace(/_/g, ' '),
        detail: event.score ? `Scored ${event.score} points around this moment.` : 'Marked as a key flight event.',
      });
    }
  }
  for (let i = 1; i < samples.length; i++) {
    const recoveryJump = samples[i].recovery - samples[i - 1].recovery;
    if (recoveryJump > 0.18) {
      moments.push({
        time: Math.round(samples[i].t),
        title: 'Recovery lift',
        detail: `Recovery proxy rose by ${(recoveryJump * 100).toFixed(0)}% near this point.`,
      });
    }
  }
  return moments.sort((a, b) => a.time - b.time).slice(0, 8);
}

function buildAltitudeWithEvents(samples: FlightSample[], events: FlightEvent[]) {
  const timeline = samples.map((s) => ({
    time: Math.round(s.t),
    altitude: s.altitude,
    ringHit: false as boolean,
    kill: false as boolean,
    death: false as boolean,
  }));

  for (const ev of events) {
    const closest = timeline.reduce<{ idx: number; dist: number }>(
      (best, pt, idx) => {
        const d = Math.abs(pt.time - ev.t);
        return d < best.dist ? { idx, dist: d } : best;
      },
      { idx: 0, dist: Infinity },
    );
    if (closest.dist < 3 && timeline[closest.idx]) {
      if (ev.type === 'ring_hit') timeline[closest.idx].ringHit = true;
      if (ev.type === 'kill') timeline[closest.idx].kill = true;
      if (ev.type === 'death') timeline[closest.idx].death = true;
    }
  }
  return timeline;
}

function generateInsights(session: SessionSummary): string[] {
  const insights: string[] = [];
  const s = session.samples;
  if (s.length === 0) return ['No time-series data was recorded for this session.'];

  if (session.calmTrend === 'improved') {
    insights.push('Calm proxy improved across the flight, so later moments lined up with steadier signal readings.');
  } else if (session.calmTrend === 'declined') {
    insights.push(
      'Calm proxy trended down near the end. The next pass may benefit from wider turns or a slower route.',
    );
  } else if (session.calmTrend === 'stable') {
    insights.push('Calm proxy stayed stable, which is a useful baseline for comparing future flights.');
  }

  if (session.arousalTrend === 'increased') {
    insights.push(
      'Arousal proxy increased over the session, especially useful to compare against combat or route events.',
    );
  } else if (session.arousalTrend === 'decreased') {
    insights.push('Arousal proxy decreased over time, suggesting the route became easier to settle into.');
  }

  if (session.avgHrv !== null) {
    insights.push(`Average HRV proxy was ${Math.round(session.avgHrv)}ms where rPPG confidence allowed a reading.`);
  }

  if (session.dominantBrainState) {
    insights.push(`${session.dominantBrainState} was the strongest available EEG band during this session.`);
  }

  if (session.mode === 'dogfight' && session.kills > 0) {
    const combatEvents = session.events.filter((e) => e.type === 'kill' || e.type === 'death');
    if (combatEvents.length > 0) {
      const calmDuringCombat =
        combatEvents
          .map((ev) => {
            const closest = s.reduce((best, pt) => (Math.abs(pt.t - ev.t) < Math.abs(best.t - ev.t) ? pt : best), s[0]);
            return closest.calm;
          })
          .reduce((a, b) => a + b, 0) / combatEvents.length;

      if (session.avgCalm !== null && calmDuringCombat < session.avgCalm * 0.8) {
        insights.push('Duel moments lined up with lower calm proxy readings than the flight average.');
      }
    }
  }

  if (session.peakBpm !== null && session.minBpm !== null) {
    const range = session.peakBpm - session.minBpm;
    if (range > 30) {
      insights.push(
        `Heart-rate proxy ranged ${Math.round(range)} BPM during the flight (${Math.round(session.minBpm)}-${Math.round(session.peakBpm)}).`,
      );
    }
  }

  if (session.signalCoveragePct < 20) {
    insights.push('Signal coverage was low, so the debrief leans more on flight events than biofeedback.');
  }

  return insights;
}

/* ─── Main component ─── */

export function SummaryScreen() {
  const navigate = useNavigate();
  const lastSession = useGameStore((s) => s.lastSession);

  const data = useMemo(() => {
    if (!lastSession) return null;
    const s = lastSession.samples;
    const e = lastSession.events;
    return {
      flight: buildFlightTimeline(s),
      altWithEvents: buildAltitudeWithEvents(s, e),
      neural: buildNeuralTimeline(s),
      bpm: buildBpmTimeline(s),
      eeg: buildEegTimeline(s),
      alphaPeak: buildAlphaPeakTimeline(s),
      respiration: buildRespirationTimeline(s),
      cogLoad: buildCognitiveLoadTimeline(s),
      stressVsStability: buildStressVsAltitudeScatter(s),
      phases: buildPhaseBreakdown(s),
      eventWindows: buildEventWindows(s, e),
      notableMoments: buildNotableMoments(s, e),
      insights: generateInsights(lastSession),
    };
  }, [lastSession]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  };

  const modeLabel = lastSession ? getModeTitle(lastSession.mode) : 'Flight';

  if (!lastSession) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto"
        style={{ background: 'var(--color-bg-primary)' }}
      >
        <p className="text-lg tracking-wide mb-8" style={{ fontFamily: 'var(--font-heading)', color: COLORS.cyan }}>
          NO FLIGHT DATA
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-10 py-4 border text-sm font-bold tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-transform rounded-lg"
          style={{
            fontFamily: 'var(--font-heading)',
            borderColor: COLORS.cyan,
            color: COLORS.cyan,
            background: 'transparent',
          }}
        >
          MENU
        </button>
      </div>
    );
  }

  const accuracy = lastSession.shotsFired > 0 ? Math.round((lastSession.shotsHit / lastSession.shotsFired) * 100) : 0;
  const isDogfight = lastSession.mode === 'dogfight';
  const isZen = lastSession.mode === 'zen';
  const isExpedition = lastSession.mode === 'free';
  const hasNeuro = lastSession.neuroSource !== 'none';
  const map = getMap(lastSession.mapId);
  const modeMeta = getModeMeta(lastSession.mode as 'zen' | 'free' | 'dogfight');
  const difficulty = lastSession.difficulty ?? 'rookie';

  const ringEvents = lastSession.events.filter((e) => e.type === 'ring_hit');
  const killEvents = lastSession.events.filter((e) => e.type === 'kill');
  const deathEvents = lastSession.events.filter((e) => e.type === 'death');
  const objectiveEvents = lastSession.events.filter(
    (e) => e.type === 'objective_complete' || e.type === 'postcard' || e.type === 'landmark_discovered',
  );

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto"
      style={{ background: 'var(--color-bg-primary)', fontFamily: 'var(--font-mono)', padding: '140px 64px' }}
    >
      {/* Header */}
      <p className="tracking-[0.3em] uppercase" style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>
        {modeLabel} &middot; {map.storyName ?? map.name} &middot;{' '}
        {lastSession.aircraftId.replace(/_/g, ' ').toUpperCase()} &middot; {difficulty.toUpperCase()}
      </p>
      <h1
        className="font-bold tracking-wider"
        style={{ fontFamily: 'var(--font-heading)', color: COLORS.gold, fontSize: 38, marginBottom: 24 }}
      >
        {modeMeta.summaryTitle.toUpperCase()}
      </h1>
      <p className="max-w-2xl text-center leading-7" style={{ color: COLORS.text, fontSize: 14, marginBottom: 32 }}>
        {modeMeta.summaryLead}
      </p>
      <div className="text-center" style={{ marginBottom: 80 }}>
        <div className="font-bold" style={{ color: COLORS.cyan, fontSize: 52 }}>
          {lastSession.score}
        </div>
        <div className="tracking-widest" style={{ color: COLORS.textDim, fontSize: 11, marginTop: 8 }}>
          {lastSession.scoreLabel.toUpperCase()}
        </div>
      </div>

      {/* ── SECTION: Performance Stats ── */}
      <SectionHeading title="FLIGHT PERFORMANCE" color={COLORS.cyan} />
      <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
        <StatBox label="Duration" value={formatTime(lastSession.durationMs)} color={COLORS.cyan} />
        <StatBox
          label="Avg Speed"
          value={`${lastSession.averageSpeed?.toFixed(0) ?? '—'}`}
          color={COLORS.cyan}
          sub="m/s"
        />
        <StatBox
          label="Distance"
          value={`${(lastSession.totalDistance / 1000).toFixed(1)}`}
          color={COLORS.cyan}
          sub="km"
        />
        <StatBox label="Max Altitude" value={`${Math.round(lastSession.maxAltitude)}`} color={COLORS.cyan} sub="ft" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
        <StatBox
          label={isExpedition ? 'Discoveries' : isDogfight ? 'Wins Target' : 'Route Gates'}
          value={`${lastSession.objectivesCompleted}/${Math.max(1, lastSession.objectiveGoal)}`}
          color={COLORS.gold}
        />
        <StatBox label="Best Combo" value={`${lastSession.bestCombo}x`} color={COLORS.gold} />
        <StatBox
          label="Signal Coverage"
          value={`${Math.round(lastSession.signalCoveragePct)}%`}
          color={lastSession.signalCoveragePct > 30 ? COLORS.green : COLORS.orange}
        />
        {lastSession.avgFlow !== null && (
          <StatBox label="Avg Flow" value={`${Math.round(lastSession.avgFlow * 100)}%`} color={COLORS.green} />
        )}
      </div>

      {isZen && lastSession.ringsPassed > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
          <StatBox label="Rings Passed" value={lastSession.ringsPassed} color={COLORS.gold} />
          <StatBox label="Best Combo" value={`${lastSession.bestCombo}x`} color={COLORS.gold} />
        </div>
      )}

      {isDogfight && (
        <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
          <StatBox label="Wins" value={lastSession.kills} color={COLORS.red} />
          <StatBox label="Losses" value={lastSession.deaths} color={COLORS.red} />
          <StatBox
            label="Win Ratio"
            value={
              lastSession.deaths > 0
                ? (lastSession.kills / lastSession.deaths).toFixed(2)
                : lastSession.kills > 0
                  ? '∞'
                  : '0'
            }
            color={COLORS.red}
          />
          <StatBox
            label="Accuracy"
            value={`${accuracy}%`}
            color={COLORS.red}
            sub={`${lastSession.shotsHit}/${lastSession.shotsFired}`}
          />
        </div>
      )}

      {objectiveEvents.length > 0 && (
        <>
          <SectionHeading title="MISSION LOG" color={COLORS.gold} />
          <div className="grid w-full max-w-4xl gap-3" style={{ marginBottom: 56 }}>
            {objectiveEvents.slice(0, 8).map((event, index) => (
              <div
                key={`${event.type}-${event.t}-${index}`}
                className="rounded-lg border"
                style={{
                  borderColor: 'rgba(255,204,68,0.16)',
                  background: 'rgba(255,204,68,0.05)',
                  padding: '16px 18px',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-bold" style={{ color: COLORS.gold, fontFamily: 'var(--font-heading)' }}>
                    {event.label ?? event.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: COLORS.textDim }}>
                    {Math.round(event.t)}s{event.score ? ` / ${event.score} pts` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SECTION: Flight Charts ── */}
      {data && data.flight.length > 2 && (
        <div className="w-full max-w-4xl flex flex-col" style={{ gap: 40, marginBottom: 80 }}>
          {/* Altitude Over Time with events */}
          <ChartContainer title="ALTITUDE PROFILE">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data.altWithEvents}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}ft`} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Area
                  type="monotone"
                  dataKey="altitude"
                  stroke={COLORS.cyan}
                  fill={COLORS.cyan}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Altitude (ft)"
                />
                {ringEvents.map((ev, i) => (
                  <ReferenceLine
                    key={`ring-${i}`}
                    x={Math.round(ev.t)}
                    stroke={COLORS.gold}
                    strokeDasharray="2 4"
                    strokeOpacity={0.5}
                  />
                ))}
                {killEvents.map((ev, i) => (
                  <ReferenceLine
                    key={`kill-${i}`}
                    x={Math.round(ev.t)}
                    stroke={COLORS.green}
                    strokeDasharray="2 4"
                    strokeOpacity={0.6}
                  />
                ))}
                {deathEvents.map((ev, i) => (
                  <ReferenceLine
                    key={`death-${i}`}
                    x={Math.round(ev.t)}
                    stroke={COLORS.red}
                    strokeDasharray="2 4"
                    strokeOpacity={0.6}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            {(ringEvents.length > 0 || killEvents.length > 0 || deathEvents.length > 0) && (
              <div className="flex" style={{ color: COLORS.textDim, gap: 16, marginTop: 12, fontSize: 10 }}>
                {ringEvents.length > 0 && (
                  <span>
                    <span style={{ color: COLORS.gold }}>|</span> Ring Hit
                  </span>
                )}
                {killEvents.length > 0 && (
                  <span>
                    <span style={{ color: COLORS.green }}>|</span> Rival Tag
                  </span>
                )}
                {deathEvents.length > 0 && (
                  <span>
                    <span style={{ color: COLORS.red }}>|</span> Reset
                  </span>
                )}
              </div>
            )}
          </ChartContainer>

          {/* Speed + Throttle Over Time */}
          <ChartContainer title="SPEED + THROTTLE">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data.flight}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis yAxisId="spd" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}`} />
                <YAxis
                  yAxisId="thr"
                  orientation="right"
                  domain={[0, 100]}
                  stroke={COLORS.axisStroke}
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Line
                  yAxisId="spd"
                  type="monotone"
                  dataKey="speed"
                  stroke={COLORS.cyan}
                  strokeWidth={2}
                  dot={false}
                  name="Speed (m/s)"
                />
                <Area
                  yAxisId="thr"
                  type="monotone"
                  dataKey="throttle"
                  stroke={COLORS.gold}
                  fill={COLORS.gold}
                  fillOpacity={0.06}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  name="Throttle %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Heading Over Time */}
          <ChartContainer title="HEADING TRACK">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.flight}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis domain={[0, 360]} stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}°`} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                <ReferenceLine
                  y={90}
                  stroke={COLORS.textDim}
                  strokeDasharray="4 4"
                  label={{ value: 'E', position: 'right', style: { fill: COLORS.textDim, fontSize: 9 } }}
                />
                <ReferenceLine
                  y={180}
                  stroke={COLORS.textDim}
                  strokeDasharray="4 4"
                  label={{ value: 'S', position: 'right', style: { fill: COLORS.textDim, fontSize: 9 } }}
                />
                <ReferenceLine
                  y={270}
                  stroke={COLORS.textDim}
                  strokeDasharray="4 4"
                  label={{ value: 'W', position: 'right', style: { fill: COLORS.textDim, fontSize: 9 } }}
                />
                <Line
                  type="monotone"
                  dataKey="heading"
                  stroke={COLORS.orange}
                  strokeWidth={1.5}
                  dot={false}
                  name="Heading°"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

      {/* ── SECTION: Neural Performance Stats ── */}
      {hasNeuro && (
        <>
          <SectionHeading title="SIGNAL PERFORMANCE" color={COLORS.gold} />
          <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
            {lastSession.avgCalm !== null && (
              <StatBox label="Avg Calm" value={`${(lastSession.avgCalm * 100).toFixed(0)}%`} color={COLORS.green} />
            )}
            {lastSession.avgArousal !== null && (
              <StatBox
                label="Avg Arousal"
                value={`${(lastSession.avgArousal * 100).toFixed(0)}%`}
                color={COLORS.magenta}
              />
            )}
            {lastSession.calmTrend && (
              <StatBox
                label="Composure Trend"
                value={
                  lastSession.calmTrend === 'improved'
                    ? 'Improved'
                    : lastSession.calmTrend === 'declined'
                      ? 'Declined'
                      : 'Stable'
                }
                color={
                  lastSession.calmTrend === 'improved'
                    ? COLORS.green
                    : lastSession.calmTrend === 'declined'
                      ? COLORS.red
                      : COLORS.cyan
                }
              />
            )}
            {lastSession.arousalTrend && (
              <StatBox
                label="Arousal Trend"
                value={
                  lastSession.arousalTrend === 'increased'
                    ? 'Increased'
                    : lastSession.arousalTrend === 'decreased'
                      ? 'Decreased'
                      : 'Stable'
                }
                color={
                  lastSession.arousalTrend === 'increased'
                    ? COLORS.magenta
                    : lastSession.arousalTrend === 'decreased'
                      ? COLORS.green
                      : COLORS.cyan
                }
              />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 32 }}>
            {lastSession.avgBpm !== null && (
              <StatBox label="Avg Heart Rate" value={Math.round(lastSession.avgBpm)} color={COLORS.magenta} sub="BPM" />
            )}
            {lastSession.peakBpm !== null && (
              <StatBox label="Peak HR" value={Math.round(lastSession.peakBpm)} color={COLORS.red} sub="BPM" />
            )}
            {lastSession.minBpm !== null && (
              <StatBox label="Min HR" value={Math.round(lastSession.minBpm)} color={COLORS.green} sub="BPM" />
            )}
            {lastSession.avgHrv !== null && (
              <StatBox label="Avg HRV" value={Math.round(lastSession.avgHrv)} color={COLORS.cyan} sub="ms RMSSD" />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl" style={{ gap: 20, marginBottom: 48 }}>
            {lastSession.avgAlpha !== null && (
              <StatBox label="Avg Alpha" value={lastSession.avgAlpha.toFixed(3)} color={COLORS.green} sub="power" />
            )}
            {lastSession.avgBeta !== null && (
              <StatBox label="Avg Beta" value={lastSession.avgBeta.toFixed(3)} color={COLORS.magenta} sub="power" />
            )}
            {lastSession.avgTheta !== null && (
              <StatBox label="Avg Theta" value={lastSession.avgTheta.toFixed(3)} color={COLORS.cyan} sub="power" />
            )}
            {lastSession.dominantBrainState && (
              <StatBox label="Dominant State" value={lastSession.dominantBrainState} color={COLORS.gold} />
            )}
          </div>
        </>
      )}

      {/* ── SECTION: Signal analysis charts ── */}
      {hasNeuro && data && (
        <>
          <SectionHeading title="SIGNAL RESPONSE" color={COLORS.magenta} />
          <p
            className="tracking-wide w-full max-w-4xl"
            style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 40 }}
          >
            These charts compare available signal proxies with the flight timeline. They are not medical measures.
          </p>

          <div className="w-full max-w-4xl flex flex-col" style={{ gap: 40, marginBottom: 80 }}>
            {/* Calm / Arousal Over Time */}
            {data.neural.length > 2 && (
              <ChartContainer title="CALM / AROUSAL OVER SESSION">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={data.neural}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis
                      domain={[0, 100]}
                      stroke={COLORS.axisStroke}
                      tick={axisTick}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <ReferenceLine y={60} stroke={`${COLORS.green}30`} strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="calm"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      dot={false}
                      name="Calm %"
                    />
                    <Line
                      type="monotone"
                      dataKey="arousal"
                      stroke={COLORS.magenta}
                      strokeWidth={2}
                      dot={false}
                      name="Arousal %"
                    />
                    {killEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`ck-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.green}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                    {deathEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`cd-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.red}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                    {ringEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`cr-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.gold}
                        strokeDasharray="2 3"
                        strokeOpacity={0.3}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
                {(ringEvents.length > 0 || killEvents.length > 0 || deathEvents.length > 0) && (
                  <div className="flex" style={{ color: COLORS.textDim, gap: 16, marginTop: 12, fontSize: 10 }}>
                    <span>Vertical lines mark game events</span>
                  </div>
                )}
              </ChartContainer>
            )}

            {/* Heart Rate + HRV */}
            {data.bpm.length > 2 && (
              <ChartContainer title="HEART RATE + HRV TIMELINE">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={data.bpm}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis yAxisId="bpm" stroke={COLORS.axisStroke} tick={axisTick} />
                    <YAxis yAxisId="hrv" orientation="right" stroke={COLORS.axisStroke} tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <Area
                      yAxisId="bpm"
                      type="monotone"
                      dataKey="bpm"
                      stroke={COLORS.magenta}
                      fill={COLORS.magenta}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      name="Heart Rate (BPM)"
                    />
                    {data.bpm.some((d) => d.hrv !== undefined) && (
                      <Line
                        yAxisId="hrv"
                        type="monotone"
                        dataKey="hrv"
                        stroke={COLORS.cyan}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        name="HRV (ms)"
                      />
                    )}
                    {ringEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`hr-r-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.gold}
                        strokeDasharray="2 3"
                        strokeOpacity={0.3}
                      />
                    ))}
                    {killEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`hr-k-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.green}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                    {deathEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`hr-d-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.red}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            {/* EEG Band Powers */}
            {data.eeg.length > 2 && (
              <ChartContainer title="EEG BAND POWERS OVER SESSION">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.eeg}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke={COLORS.axisStroke} tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <Line
                      type="monotone"
                      dataKey="alpha"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      dot={false}
                      name="Alpha"
                    />
                    <Line
                      type="monotone"
                      dataKey="beta"
                      stroke={COLORS.magenta}
                      strokeWidth={2}
                      dot={false}
                      name="Beta"
                    />
                    <Line
                      type="monotone"
                      dataKey="theta"
                      stroke={COLORS.cyan}
                      strokeWidth={1.5}
                      dot={false}
                      name="Theta"
                    />
                    <Line
                      type="monotone"
                      dataKey="delta"
                      stroke={COLORS.yellow}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Delta"
                    />
                    <Line
                      type="monotone"
                      dataKey="gamma"
                      stroke={COLORS.orange}
                      strokeWidth={1}
                      strokeDasharray="2 4"
                      dot={false}
                      name="Gamma"
                    />
                    {ringEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`eeg-r-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.gold}
                        strokeDasharray="2 3"
                        strokeOpacity={0.3}
                      />
                    ))}
                    {killEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`eeg-k-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.green}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                    {deathEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`eeg-d-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.red}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            {/* Cognitive Load (Beta/Alpha ratio) */}
            {data.cogLoad.length > 2 && (
              <ChartContainer title="LOAD PROXY (BETA/ALPHA RATIO)">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.cogLoad}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke={COLORS.axisStroke} tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <ReferenceLine
                      y={1.0}
                      stroke={`${COLORS.red}40`}
                      strokeDasharray="4 4"
                      label={{
                        value: 'High Load',
                        position: 'right',
                        style: { fill: `${COLORS.red}60`, fontSize: 9, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="load"
                      stroke={COLORS.orange}
                      fill={COLORS.orange}
                      fillOpacity={0.08}
                      strokeWidth={2}
                      name="β/α Ratio"
                    />
                    {ringEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`cog-r-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.gold}
                        strokeDasharray="2 3"
                        strokeOpacity={0.3}
                      />
                    ))}
                    {killEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`cog-k-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.green}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                    {deathEvents.map((ev, i) => (
                      <ReferenceLine
                        key={`cog-d-${i}`}
                        x={Math.round(ev.t)}
                        stroke={COLORS.red}
                        strokeDasharray="2 3"
                        strokeOpacity={0.4}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 12 }}>
                  Beta/Alpha ratio is shown as a lightweight load proxy when EEG bands are available.
                </p>
              </ChartContainer>
            )}

            {/* Alpha Peak Frequency */}
            {data.alphaPeak.length > 2 && (
              <ChartContainer title="ALPHA PEAK FREQUENCY">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.alphaPeak}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}Hz`} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <ReferenceLine
                      y={10}
                      stroke={`${COLORS.green}30`}
                      strokeDasharray="4 4"
                      label={{
                        value: '10Hz',
                        position: 'right',
                        style: { fill: `${COLORS.green}50`, fontSize: 9, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="freq"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      dot={false}
                      name="Alpha Peak (Hz)"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 12 }}>
                  Alpha peak frequency is included as an available EEG signal feature, not a diagnosis.
                </p>
              </ChartContainer>
            )}

            {/* Respiration Rate */}
            {data.respiration.length > 2 && (
              <ChartContainer title="RESPIRATION RATE">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.respiration}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis dataKey="time" stroke={COLORS.axisStroke} tick={axisTick} tickFormatter={(v) => `${v}s`} />
                    <YAxis stroke={COLORS.axisStroke} tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `${v}s`} />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke={COLORS.green}
                      fill={COLORS.green}
                      fillOpacity={0.08}
                      strokeWidth={2}
                      name="Breaths/min"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}

            {/* Stress vs Flight Stability Scatter */}
            {data.stressVsStability.length > 3 && (
              <ChartContainer title="CALM vs FLIGHT STABILITY">
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gridLine} />
                    <XAxis
                      dataKey="calm"
                      name="Calm %"
                      stroke={COLORS.axisStroke}
                      tick={axisTick}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: 'Calm %',
                        position: 'insideBottom',
                        offset: -5,
                        style: { fill: COLORS.textDim, fontSize: 10, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <YAxis
                      dataKey="stability"
                      name="Stability"
                      stroke={COLORS.axisStroke}
                      tick={axisTick}
                      label={{
                        value: 'Stability',
                        position: 'insideLeft',
                        angle: -90,
                        style: { fill: COLORS.textDim, fontSize: 10, fontFamily: 'var(--font-mono)' },
                      }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ strokeDasharray: '3 3', stroke: `${COLORS.cyan}30` }}
                    />
                    <Scatter data={data.stressVsStability} fill={COLORS.cyan} opacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
                <p style={{ color: COLORS.textDim, fontSize: 11, marginTop: 12 }}>
                  Compares calm proxy readings with altitude stability during this flight.
                </p>
              </ChartContainer>
            )}
          </div>
        </>
      )}

      {data && (data.phases.length > 0 || data.eventWindows.length > 0 || data.notableMoments.length > 0) && (
        <>
          <SectionHeading title="FLIGHT WINDOWS" color={COLORS.cyan} />
          {data.phases.length > 0 && (
            <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3" style={{ marginBottom: 28 }}>
              {data.phases.map((phase) => (
                <div
                  key={phase.label}
                  className="rounded-lg border"
                  style={{
                    borderColor: 'rgba(0,204,204,0.14)',
                    background: 'rgba(0,204,204,0.04)',
                    padding: '18px 20px',
                  }}
                >
                  <div className="font-bold" style={{ color: COLORS.cyan, fontFamily: 'var(--font-heading)' }}>
                    {phase.label}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs" style={{ color: COLORS.text }}>
                    <span>Speed {phase.avgSpeed !== null ? `${Math.round(phase.avgSpeed)}` : '-'}</span>
                    <span>Composure {phase.composure !== null ? `${Math.round(phase.composure * 100)}%` : '-'}</span>
                    <span>Flow {phase.flow !== null ? `${Math.round(phase.flow * 100)}%` : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.eventWindows.length > 0 && (
            <div
              className="w-full max-w-4xl rounded-lg border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', padding: 24, marginBottom: 28 }}
            >
              <h3
                className="tracking-[0.2em] uppercase"
                style={{ fontFamily: 'var(--font-heading)', color: COLORS.gold, fontSize: 13, marginBottom: 18 }}
              >
                Recent Event Windows
              </h3>
              <div className="grid gap-3">
                {data.eventWindows.map((event, index) => (
                  <div
                    key={`${event.type}-${event.time}-${index}`}
                    className="grid grid-cols-[70px_1fr_110px] gap-3 text-xs"
                  >
                    <span style={{ color: COLORS.textDim }}>{event.time}s</span>
                    <span style={{ color: COLORS.text }}>{event.label}</span>
                    <span style={{ color: COLORS.cyan }}>
                      {event.flow !== null ? `Flow ${Math.round(event.flow * 100)}%` : 'No signal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.notableMoments.length > 0 && (
            <div
              className="w-full max-w-4xl rounded-lg border"
              style={{ borderColor: 'rgba(255,204,68,0.15)', padding: 24, marginBottom: 64 }}
            >
              <h3
                className="tracking-[0.2em] uppercase"
                style={{ fontFamily: 'var(--font-heading)', color: COLORS.gold, fontSize: 13, marginBottom: 18 }}
              >
                Notable Moments
              </h3>
              <div className="grid gap-3">
                {data.notableMoments.map((moment, index) => (
                  <div
                    key={`${moment.title}-${moment.time}-${index}`}
                    className="text-sm leading-6"
                    style={{ color: COLORS.text }}
                  >
                    <span style={{ color: COLORS.gold }}>{moment.time}s</span> / {moment.title}: {moment.detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SECTION: Insights ── */}
      {data && data.insights.length > 0 && (
        <>
          <SectionHeading title="FLIGHT NOTES" color={COLORS.gold} />
          <div
            className="w-full max-w-4xl rounded-xl flex flex-col"
            style={{
              border: `1px solid ${COLORS.gold}20`,
              background: `${COLORS.gold}05`,
              padding: '36px 40px',
              gap: 24,
              marginBottom: 80,
            }}
          >
            {data.insights.map((insight, i) => (
              <p key={i} className="leading-relaxed" style={{ color: COLORS.text, fontSize: 14 }}>
                {insight}
              </p>
            ))}
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div
        className="flex flex-wrap justify-center w-full max-w-4xl"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          gap: 20,
          marginTop: 40,
          marginBottom: 60,
          paddingTop: 48,
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate(
              lastSession
                ? `/fly?mode=${lastSession.mode}&map=${lastSession.mapId}&aircraft=${lastSession.aircraftId}&difficulty=${difficulty}`
                : '/fly?mode=zen',
            )
          }
          className="px-10 py-4 border-2 text-sm font-bold tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-transform rounded-lg"
          style={{
            fontFamily: 'var(--font-heading)',
            borderColor: COLORS.gold,
            color: COLORS.gold,
            background: `${COLORS.gold}08`,
          }}
        >
          FLY AGAIN
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-10 py-4 border text-sm font-bold tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-transform rounded-lg"
          style={{
            fontFamily: 'var(--font-heading)',
            borderColor: COLORS.textDim,
            color: COLORS.textDim,
            background: 'transparent',
          }}
        >
          MENU
        </button>
      </div>
    </div>
  );
}
