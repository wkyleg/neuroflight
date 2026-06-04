import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
