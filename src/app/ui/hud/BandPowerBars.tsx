interface BandPowerBarsProps {
  alpha: number | null;
  beta: number | null;
  theta: number | null;
  delta: number | null;
  gamma: number | null;
}

const BANDS = [
  { key: 'delta', label: 'δ', color: '#8844cc' },
  { key: 'theta', label: 'θ', color: '#4488ff' },
  { key: 'alpha', label: 'α', color: '#44ccaa' },
  { key: 'beta', label: 'β', color: '#ffaa44' },
  { key: 'gamma', label: 'γ', color: '#ff4466' },
] as const;

export function BandPowerBars({ alpha, beta, theta, delta, gamma }: BandPowerBarsProps) {
  const values: Record<string, number | null> = { alpha, beta, theta, delta, gamma };
  const hasData = alpha !== null || beta !== null;

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="tracking-widest" style={{ color: 'var(--color-text-secondary)', fontSize: 10, marginBottom: 6 }}>
        BAND POWER
      </div>
      <div className="flex flex-col" style={{ gap: 5 }}>
        {BANDS.map(({ key, label, color }) => {
          const val = values[key] ?? 0;
          const width = hasData ? val * 100 : 0;
          return (
            <div key={key} className="flex items-center" style={{ gap: 6 }}>
              <span className="text-right" style={{ color, fontSize: 11, width: 14 }}>
                {label}
              </span>
              <div className="flex-1 rounded-sm relative" style={{ background: 'rgba(255,255,255,0.06)', height: 8 }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-all duration-300"
                  style={{ width: `${width}%`, background: color, opacity: hasData ? 0.85 : 0.2 }}
                />
              </div>
              <span
                className="text-right tabular-nums"
                style={{ color: 'var(--color-text-secondary)', fontSize: 10, width: 28 }}
              >
                {hasData ? (val * 100).toFixed(0) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
