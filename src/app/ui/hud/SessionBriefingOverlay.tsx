import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore.ts';

const BRIEFING_DISMISSED_KEY = 'neuroflight.briefing.dismissed';

export function SessionBriefingOverlay() {
  const phase = useGameStore((s) => s.hud.sessionPhase);
  const tutorial = useGameStore((s) => s.hud.tutorial);
  const [visible, setVisible] = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);

  useEffect(() => {
    if (tutorial || phase === 'readiness' || phase === 'debrief') return;
    if (window.localStorage.getItem(BRIEFING_DISMISSED_KEY) === 'true') return;
    setVisible(true);
  }, [phase, tutorial]);

  if (!visible) return null;

  const close = () => {
    if (neverAgain) window.localStorage.setItem(BRIEFING_DISMISSED_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-30 flex justify-center px-4 py-6">
      <section
        className="premium-glass-strong pointer-events-auto w-[min(560px,calc(100vw-28px))] rounded-xl border p-6"
        style={{ borderColor: 'rgba(255,255,255,0.18)' }}
      >
        <p className="menu-card-kicker">Session briefing</p>
        <h2 className="mt-1 text-2xl font-black" style={{ color: 'var(--color-accent-gold)' }}>
          Warmup, pressure, recovery, debrief
        </h2>
        <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.74)' }}>
          This scored flight starts with a warmup, then three active waves with short recovery breaks. The debrief
          compares flight behavior across those phases. Camera data is optional and only adds signal confidence and
          ambience.
        </p>
        <label className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'rgba(240,236,224,0.68)' }}>
          <input type="checkbox" checked={neverAgain} onChange={(event) => setNeverAgain(event.target.checked)} />
          Don't show again
        </label>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={close} className="glass-button rounded-lg px-5 py-3 text-xs font-black">
            Skip
          </button>
        </div>
      </section>
    </div>
  );
}
