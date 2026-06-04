import { useRppgSignal } from '@/neuro/hooks.ts';
import { useGameStore } from '@/stores/gameStore.ts';

export function RecoveryOverlay() {
  const phase = useGameStore((s) => s.hud.sessionPhase);
  const label = useGameStore((s) => s.hud.sessionPhaseLabel);
  const prompt = useGameStore((s) => s.hud.sessionPhasePrompt);
  const tutorial = useGameStore((s) => s.hud.tutorial);
  const { signal } = useRppgSignal();
  const recovery = phase.includes('recovery');

  if (tutorial || !recovery) return null;

  const coaching =
    phase === 'final_recovery'
      ? 'Last one. Long, slow exhale. Settle your shoulders and let the cockpit quiet before your debrief.'
      : 'Ease off the controls. Breathe in for 4, out for 6. Let your shoulders and pulse settle.';

  return (
    <div className="pointer-events-none absolute left-1/2 top-[18vh] z-50 w-[min(460px,calc(100vw-32px))] -translate-x-1/2">
      <section
        className="premium-glass rounded-xl border px-6 py-5 text-center"
        style={{
          borderColor: 'rgba(94,234,212,0.24)',
          background: 'linear-gradient(135deg, rgba(12,54,58,0.76), rgba(8,21,28,0.82))',
        }}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-teal-200/25">
          <div className="neuroflight-breathing-orb h-12 w-12 rounded-full" />
        </div>
        <h3 className="mt-3 text-lg font-black" style={{ color: '#5eead4' }}>
          {label}
        </h3>
        <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
          {coaching}
        </p>
        <p className="mt-2 text-[11px] leading-5" style={{ color: 'rgba(240,236,224,0.58)' }}>
          {prompt}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(240,236,224,0.52)' }}>
          {signal.userMessage}
        </p>
      </section>
    </div>
  );
}
