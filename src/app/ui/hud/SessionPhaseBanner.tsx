import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore.ts';
import { phaseAccent, phasePosition } from './sessionPhaseUi.ts';

export function SessionPhaseBanner() {
  const phase = useGameStore((s) => s.hud.sessionPhase);
  const label = useGameStore((s) => s.hud.sessionPhaseLabel);
  const prompt = useGameStore((s) => s.hud.sessionPhasePrompt);
  const tutorial = useGameStore((s) => s.hud.tutorial);
  const phaseChangeId = useGameStore((s) => s.hud.phaseChangeId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (tutorial || phase === 'readiness' || phaseChangeId === 0) {
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [phase, phaseChangeId, tutorial]);

  if (!visible) return null;

  const accent = phaseAccent(phase);
  return (
    <div className="pointer-events-none absolute left-1/2 top-24 z-30 w-[min(620px,calc(100vw-32px))] -translate-x-1/2">
      <section
        className="premium-glass-strong rounded-xl border px-6 py-4 text-center shadow-2xl"
        style={{
          borderColor: 'rgba(255,255,255,0.22)',
          background: 'linear-gradient(135deg, rgba(8,27,36,0.78), rgba(18,48,58,0.68))',
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
          {phasePosition(phase)}
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-wide" style={{ color: 'rgba(255,246,220,0.96)' }}>
          {label}
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.72)' }}>
          {prompt}
        </p>
      </section>
    </div>
  );
}
