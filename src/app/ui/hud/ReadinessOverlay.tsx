import { useState } from 'react';
import { CameraPreview } from '@/app/ui/hud/NeuroCockpit.tsx';
import { useRppgSignal } from '@/neuro/hooks.ts';
import { useGameStore } from '@/stores/gameStore.ts';

function statusTitle(status: string): string {
  switch (status) {
    case 'ready':
      return 'Camera signal ready';
    case 'starting':
      return 'Starting camera';
    case 'warming':
      return 'Warming signal';
    case 'weak':
    case 'degraded':
      return 'Signal needs a little help';
    case 'permission_needed':
      return 'Camera permission needed';
    case 'failed':
      return 'Biofeedback unavailable';
    case 'behavior_only':
      return 'Behavior-only ready';
    default:
      return 'Camera optional';
  }
}

export function ReadinessOverlay() {
  const game = useGameStore((s) => s.game);
  const hud = useGameStore((s) => s.hud);
  const { signal, cameraActive, connecting, enableCamera } = useRppgSignal();
  const [showTips, setShowTips] = useState(false);

  const begin = () => game?.resolveReadiness();
  const behaviorOnly = () => game?.continueBehaviorOnly();
  const retryCamera = () => {
    void enableCamera();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/48 backdrop-blur-[2px]" />
      <section
        className="premium-glass-strong relative grid w-[min(760px,calc(100vw-24px))] gap-5 rounded-xl border p-5 md:grid-cols-[220px_1fr] md:p-7"
        style={{ borderColor: 'rgba(255,255,255,0.18)' }}
      >
        <div>
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgba(94,234,212,0.28)' }}>
            <CameraPreview active={cameraActive} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'rgba(240,236,224,0.58)' }}>
                Coverage
              </div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#5eead4' }}>
                {Math.round(signal.coverageSession * 100)}%
              </div>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'rgba(240,236,224,0.58)' }}>
                BPM
              </div>
              <div className="text-lg font-black tabular-nums" style={{ color: '#fb7185' }}>
                {signal.displayBpm ? Math.round(signal.displayBpm) : '--'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <p className="menu-card-kicker">Readiness</p>
            <h1 className="mt-1 text-3xl font-black tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>
              {statusTitle(signal.status)}
            </h1>
            <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.76)' }}>
              {signal.userMessage} Camera biofeedback is optional and only affects ambience and debrief confidence. Your
              session score comes from flight behavior.
            </p>
            <p className="mt-3 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.56)' }}>
              {hud.sessionPhaseRemainingMs > 0
                ? `Auto-begin fallback in ${Math.ceil(hud.sessionPhaseRemainingMs / 1000)} seconds.`
                : 'Begin whenever you are ready.'}
            </p>
            {showTips && (
              <ul className="mt-3 grid gap-2 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
                <li>Face the screen with steady front lighting.</li>
                <li>Glasses and motion can make camera estimates less available.</li>
                <li>Behavior-only sessions produce the same score and route flow.</li>
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={begin} className="glass-button rounded-lg px-5 py-3 text-xs font-black">
              Begin Session
            </button>
            <button
              type="button"
              onClick={behaviorOnly}
              className="glass-button rounded-lg px-5 py-3 text-xs font-black"
            >
              Continue Behavior-Only
            </button>
            <button
              type="button"
              onClick={retryCamera}
              className="glass-button rounded-lg px-5 py-3 text-xs font-black"
              disabled={connecting}
            >
              {connecting ? 'Starting...' : 'Retry Camera'}
            </button>
            <button
              type="button"
              onClick={() => setShowTips((value) => !value)}
              className="glass-button rounded-lg px-5 py-3 text-xs font-black"
            >
              Quick Tips
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
