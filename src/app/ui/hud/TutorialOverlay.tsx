import { useGameStore } from '@/stores/gameStore.ts';

function keyHints(title: string): string[] {
  if (title.includes('Pitch')) return ['W', 'S'];
  if (title.includes('Roll')) return ['A', 'D'];
  if (title.includes('Throttle')) return ['Shift', 'Ctrl'];
  if (title.includes('Gate')) return ['W/S', 'A/D'];
  if (title.includes('Fire') || title.includes('Rival')) return ['F', 'Click'];
  return ['W/S', 'A/D'];
}

export function TutorialOverlay() {
  const hud = useGameStore((s) => s.hud);
  const game = useGameStore((s) => s.game);
  if (!hud.tutorial) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-24 z-30 w-[min(520px,calc(100vw-32px))] -translate-x-1/2">
      <section
        className="premium-glass-strong rounded-xl border px-5 py-4"
        style={{ borderColor: 'rgba(255,255,255,0.18)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="menu-card-kicker">Tutorial</p>
            <h2 className="mt-1 text-2xl font-black" style={{ color: 'var(--color-accent-gold)' }}>
              {hud.tutorialStageTitle}
            </h2>
          </div>
          <div className="flex gap-1">
            {keyHints(hud.tutorialStageTitle).map((key) => (
              <span
                key={key}
                className="rounded-md border px-2 py-1 text-[10px] font-black"
                style={{ borderColor: 'rgba(94,234,212,0.32)', color: '#5eead4' }}
              >
                {key}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.76)' }}>
          {hud.tutorialStagePrompt}
        </p>
        <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.56)' }}>
          {hud.tutorialStageHint}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.round(hud.tutorialStageProgress * 100)}%`,
              background: 'linear-gradient(90deg, #5eead4, #facc15)',
            }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] leading-4" style={{ color: 'rgba(240,236,224,0.52)' }}>
            Skill progress advances automatically. Next is always available.
          </p>
          <button
            type="button"
            onClick={() => game?.advanceTutorial()}
            className="glass-button pointer-events-auto rounded-lg px-5 py-3 text-xs font-black"
          >
            Next
          </button>
        </div>
        {hud.tutorialStageComplete && (
          <p className="mt-3 text-xs font-bold" style={{ color: '#a7f3d0' }}>
            Free practice unlocked.
          </p>
        )}
      </section>
    </div>
  );
}
