import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { sessionPhaseLabel } from '@/game/session/sessionTypes.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';

interface ChartRow {
  t: number;
  phase: string;
  bpm: number | null;
  coverage: number;
  score: number;
  speed: number;
  altitude: number;
  focus: number;
  calm: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function focusProxy(sample: SessionSummary['samples'][number]): number {
  const behavior =
    clamp01(sample.objectiveProgress) * 0.44 +
    clamp01(sample.combo / 8) * 0.22 +
    sample.flow * 0.2 +
    sample.composure * 0.14;
  const camera = sample.flow * 0.5 + sample.composure * 0.32 + (1 - sample.neuroLoad) * 0.18;
  return Math.round(clamp01(sample.canPublish ? camera * 0.68 + behavior * 0.32 : behavior) * 100);
}

function calmProxy(sample: SessionSummary['samples'][number]): number {
  const stableThrottle = 1 - Math.min(1, Math.abs(sample.throttle - 0.58) / 0.58);
  const behavior =
    sample.composure * 0.42 + (1 - sample.neuroLoad) * 0.3 + stableThrottle * 0.16 + sample.recovery * 0.12;
  const camera = sample.recovery * 0.48 + sample.calm * 0.34 + sample.composure * 0.18;
  return Math.round(clamp01(sample.canPublish ? camera * 0.7 + behavior * 0.3 : behavior) * 100);
}

function rows(session: SessionSummary): ChartRow[] {
  return session.samples.map((sample) => ({
    t: Math.round(sample.t),
    phase: sessionPhaseLabel(sample.phase),
    bpm: sample.canPublish ? sample.bpm : null,
    coverage: Math.round(sample.signalCoverageTrailing * 100),
    score: sample.score,
    speed: Math.round(sample.speed),
    altitude: Math.round(sample.altitude),
    focus: focusProxy(sample),
    calm: calmProxy(sample),
  }));
}

function phaseMarkers(session: SessionSummary): Array<{ t: number; label: string }> {
  const markers = new Map<string, { t: number; label: string }>();
  for (const sample of session.samples) {
    if (!markers.has(sample.phase)) {
      markers.set(sample.phase, { t: Math.round(sample.t), label: sessionPhaseLabel(sample.phase) });
    }
  }
  return Array.from(markers.values()).filter((marker) => marker.t > 0);
}

function phaseSpans(session: SessionSummary): Array<{ start: number; end: number; label: string; recovery: boolean }> {
  const spans = new Map<string, { start: number; end: number; label: string; recovery: boolean }>();
  for (const sample of session.samples) {
    const key = sample.phase;
    const existing = spans.get(key);
    const t = Math.round(sample.t);
    if (existing) {
      existing.end = t;
    } else {
      spans.set(key, {
        start: t,
        end: t,
        label: sessionPhaseLabel(sample.phase),
        recovery: sample.phase === 'recovery_1' || sample.phase === 'final_recovery',
      });
    }
  }
  return Array.from(spans.values()).filter((span) => span.end > span.start);
}

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border p-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.58)' }}>
        {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

export function ReportCharts({ session }: { session: SessionSummary }) {
  const data = rows(session);
  const markers = phaseMarkers(session);
  const eventTicks = session.events.filter((event) =>
    ['ring_hit', 'kill', 'crash', 'route_complete'].includes(event.type),
  );

  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-5 text-sm" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        Advanced telemetry is unavailable for this partial session.
      </div>
    );
  }

  const common = {
    data,
    margin: { top: 8, right: 18, bottom: 8, left: -10 },
  };

  return (
    <div className="grid gap-4">
      <ChartShell title="BPM and signal coverage">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...common}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="t" stroke="rgba(240,236,224,0.56)" tickFormatter={(value) => `${value}s`} />
            <YAxis yAxisId="left" stroke="#fb7185" />
            <YAxis yAxisId="right" orientation="right" stroke="#93c5fd" domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#08141c', border: '1px solid rgba(255,255,255,0.18)' }} />
            <Legend />
            {markers.map((marker) => (
              <ReferenceLine key={marker.label} x={marker.t} stroke="rgba(255,255,255,0.2)" label={marker.label} />
            ))}
            <Line yAxisId="left" type="monotone" dataKey="bpm" stroke="#fb7185" dot={false} connectNulls={false} />
            <Line yAxisId="right" type="monotone" dataKey="coverage" stroke="#93c5fd" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Score, speed, and altitude">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...common}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="t" stroke="rgba(240,236,224,0.56)" tickFormatter={(value) => `${value}s`} />
            <YAxis stroke="rgba(240,236,224,0.62)" />
            <Tooltip contentStyle={{ background: '#08141c', border: '1px solid rgba(255,255,255,0.18)' }} />
            <Legend />
            {eventTicks.slice(0, 14).map((event) => (
              <ReferenceLine key={`${event.type}-${event.t}`} x={Math.round(event.t)} stroke="rgba(250,204,21,0.24)" />
            ))}
            <Line type="monotone" dataKey="score" stroke="#facc15" dot={false} />
            <Line type="monotone" dataKey="speed" stroke="#5eead4" dot={false} />
            <Line type="monotone" dataKey="altitude" stroke="#a78bfa" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

export function CombinedStateTimeline({ session }: { session: SessionSummary }) {
  const data = rows(session);
  const spans = phaseSpans(session);
  const markers = phaseMarkers(session);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-5 text-sm" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        Timeline is unavailable for this partial session.
      </div>
    );
  }

  return (
    <ChartShell title="Training state over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 22, bottom: 8, left: -8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="t" stroke="rgba(240,236,224,0.56)" tickFormatter={(value) => `${value}s`} />
          <YAxis yAxisId="left" stroke="rgba(240,236,224,0.62)" domain={[0, 100]} />
          <YAxis yAxisId="altitude" orientation="right" stroke="#a78bfa" />
          <Tooltip contentStyle={{ background: '#08141c', border: '1px solid rgba(255,255,255,0.18)' }} />
          <Legend />
          {spans.map((span) => (
            <ReferenceArea
              key={`${span.label}-${span.start}`}
              x1={span.start}
              x2={span.end}
              yAxisId="left"
              fill={span.recovery ? 'rgba(167,243,208,0.1)' : 'rgba(250,204,21,0.07)'}
              strokeOpacity={0}
            />
          ))}
          {markers.map((marker) => (
            <ReferenceLine key={marker.label} x={marker.t} yAxisId="left" stroke="rgba(255,255,255,0.18)" />
          ))}
          <Line yAxisId="left" name="Focus proxy" type="monotone" dataKey="focus" stroke="#facc15" dot={false} />
          <Line yAxisId="left" name="Calm proxy" type="monotone" dataKey="calm" stroke="#a7f3d0" dot={false} />
          <Line
            yAxisId="altitude"
            name="Altitude"
            type="monotone"
            dataKey="altitude"
            stroke="#a78bfa"
            dot={false}
            strokeOpacity={0.72}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
