import { useEffect, useState } from 'react';
import { useRppgSignal } from '@/neuro/hooks.ts';
import { useGameStore } from '@/stores/gameStore.ts';

type BreathPhase = 'inhale' | 'hold' | 'exhale';

const BREATH_CYCLE: { phase: BreathPhase; duration: number; label: string }[] = [
  { phase: 'inhale', duration: 4000, label: 'Breathe in…' },
  { phase: 'hold', duration: 1000, label: 'Hold…' },
  { phase: 'exhale', duration: 6000, label: 'Breathe out…' },
];

export function RecoveryOverlay() {
  const phase = useGameStore((s) => s.hud.sessionPhase);
  const label = useGameStore((s) => s.hud.sessionPhaseLabel);
  const tutorial = useGameStore((s) => s.hud.tutorial);
  const { signal } = useRppgSignal();
  const recovery = phase.includes('recovery');
  const [breathIdx, setBreathIdx] = useState(0);

  useEffect(() => {
    if (!recovery) return;
    let idx = 0;
    let timer: number;
    const next = () => {
      setBreathIdx(idx);
      timer = window.setTimeout(() => {
        idx = (idx + 1) % BREATH_CYCLE.length;
        next();
      }, BREATH_CYCLE[idx].duration);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [recovery]);

  if (tutorial || !recovery) return null;

  const breath = BREATH_CYCLE[breathIdx];
  const isFinal = phase === 'final_recovery';

  const coaching = isFinal
    ? 'Last recovery. Long exhale, loose shoulders. Settle your breathing and your thoughts before the debrief.'
    : 'Ease off the controls. Follow the orb — breathe in for 4, hold for 1, out for 6. Let your pulse settle.';

  const orbColor =
    breath.phase === 'inhale'
      ? 'rgba(94,234,212,0.92)'
      : breath.phase === 'hold'
        ? 'rgba(167,243,208,0.9)'
        : 'rgba(56,189,248,0.88)';

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: 20, top: '22vh', width: 'min(340px, calc(50vw - 24px))' }}
    >
      <section
        className="premium-glass rounded-2xl border px-5 py-5"
        style={{
          borderColor: 'rgba(94,234,212,0.28)',
          background: 'linear-gradient(150deg, rgba(8,48,52,0.88), rgba(5,18,26,0.92))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.38)',
        }}
      >
        <div className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: 'rgba(94,234,212,0.72)' }}>
          {label}
        </div>

        {/* Breathing orb — centered */}
        <div className="mt-4 flex flex-col items-center">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 96,
              height: 96,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(94,234,212,0.18)',
            }}
          >
            <div
              className="neuroflight-breathing-orb rounded-full"
              style={{
                width: 56,
                height: 56,
                background: `radial-gradient(circle, ${orbColor}, rgba(56,189,248,0.18))`,
              }}
            />
          </div>
          <div
            className="mt-3 text-sm font-bold tracking-wide"
            style={{ color: 'rgba(240,236,224,0.88)', minHeight: 20, textAlign: 'center' }}
          >
            {breath.label}
          </div>
          <div className="mt-0.5 flex gap-1.5">
            {BREATH_CYCLE.map((step, i) => (
              <div
                key={step.phase}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === breathIdx ? 24 : 8,
                  background: i === breathIdx ? '#5eead4' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Coaching */}
        <p className="mt-4 text-[11px] leading-5" style={{ color: 'rgba(240,236,224,0.72)' }}>
          {coaching}
        </p>

        {/* Signal status */}
        {signal.status !== 'off' && signal.status !== 'behavior_only' && (
          <div className="mt-3 flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: signal.status === 'ready' ? '#5eead4' : 'rgba(255,255,255,0.3)',
              }}
            />
            <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'rgba(240,236,224,0.46)' }}>
              {signal.userMessage}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
