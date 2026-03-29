interface MetricsColumnProps {
  bpm: number | null;
  bpmQuality: number;
  hrvRmssd: number | null;
  respirationRate: number | null;
  signalQuality: number;
  calmnessState: string | null;
  alphaPeakFreq: number | null;
}

export function MetricsColumn({
  bpm,
  bpmQuality,
  hrvRmssd,
  respirationRate,
  signalQuality,
  calmnessState,
  alphaPeakFreq,
}: MetricsColumnProps) {
  const metrics = [
    {
      label: 'BPM',
      value: bpm !== null ? Math.round(bpm).toString() : '—',
      color: bpmQuality > 0.5 ? '#ff6688' : 'var(--color-text-secondary)',
    },
    { label: 'HRV', value: hrvRmssd !== null ? `${hrvRmssd.toFixed(0)}ms` : '—', color: 'var(--color-text-secondary)' },
    {
      label: 'RESP',
      value: respirationRate !== null ? respirationRate.toFixed(1) : '—',
      color: 'var(--color-text-secondary)',
    },
    {
      label: 'SIG',
      value: `${(signalQuality * 100).toFixed(0)}%`,
      color: signalQuality > 0.7 ? '#44ff88' : signalQuality > 0.3 ? '#ffaa44' : '#ff4444',
    },
    { label: 'STATE', value: calmnessState ?? '—', color: 'var(--color-accent-cyan)' },
    { label: 'α PKHz', value: alphaPeakFreq !== null ? alphaPeakFreq.toFixed(1) : '—', color: '#44ccaa' },
  ];

  return (
    <div className="h-full flex flex-col justify-center" style={{ gap: 4 }}>
      {metrics.map(({ label, value, color }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="tracking-wider" style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}>
            {label}
          </span>
          <span className="font-medium tabular-nums" style={{ color, fontSize: 12 }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
