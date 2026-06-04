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

  return (
    <div className="pointer-events-none absolute bottom-40 left-1/2 z-20 w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
      <section
        className="premium-glass rounded-xl border px-5 py-4 text-center"
        style={{
          borderColor: 'rgba(94,234,212,0.24)',
          background: 'linear-gradient(135deg, rgba(12,54,58,0.52), rgba(8,21,28,0.56))',
        }}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-teal-200/25">
          <div className="neuroflight-breathing-orb h-12 w-12 rounded-full" />
        </div>
        <h3 className="mt-3 text-lg font-black" style={{ color: '#5eead4' }}>
          {label}
        </h3>
        <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
          {prompt}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(240,236,224,0.52)' }}>
          {signal.userMessage}
        </p>
      </section>
    </div>
  );
}
