interface BrainRingProps {
  calm: number;
  arousal: number;
}

export function BrainRing({ calm, arousal }: BrainRingProps) {
  const size = 80;
  const center = size / 2;
  const radius = 30;
  const strokeWidth = 4;

  const calmAngle = calm * Math.PI;
  const arousalAngle = arousal * Math.PI;

  const calmArc = describeArc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + calmAngle);
  const arousalArc = describeArc(center, center, radius, Math.PI / 2, Math.PI / 2 - arousalAngle);

  const label =
    calm > 0.6 && arousal < 0.4
      ? 'RELAXED'
      : arousal > 0.6 && calm < 0.4
        ? 'ALERT'
        : calm > 0.5 && arousal > 0.5
          ? 'FOCUSED'
          : 'BALANCED';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <title>Calm and arousal ring</title>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {calm > 0 && <path d={calmArc} fill="none" stroke="#00ccff" strokeWidth={strokeWidth} strokeLinecap="round" />}
        {arousal > 0 && (
          <path d={arousalArc} fill="none" stroke="#ff4466" strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
        <text x={center} y={center - 4} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="6">
          {(calm * 100).toFixed(0)}%
        </text>
        <text x={center} y={center + 10} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="6">
          {(arousal * 100).toFixed(0)}%
        </text>
      </svg>
      <div className="text-[7px] tracking-wider mt-[-4px]" style={{ color: 'var(--color-accent-cyan)' }}>
        {label}
      </div>
      <div className="flex gap-3 text-[6px] mt-[2px]">
        <span style={{ color: '#00ccff' }}>CALM</span>
        <span style={{ color: '#ff4466' }}>AROUSAL</span>
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const diff = endAngle - startAngle;
  const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;
  const sweep = diff > 0 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}
