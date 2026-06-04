import { useEffect, useState } from 'react';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

interface NeuroConnectBannerProps {
  variant?: 'floating' | 'dock';
}

function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!value) {
      setDisplay(false);
      return;
    }
    const timer = window.setTimeout(() => setDisplay(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return display;
}

export function NeuroConnectBanner({ variant = 'floating' }: NeuroConnectBannerProps = {}) {
  const { cameraActive, connecting } = useNeuroConnection();
  const [dismissed, setDismissed] = useState(false);

  const readyEnough = useDelayedTrue(cameraActive, 600);
  if (dismissed || readyEnough) return null;
  const docked = variant === 'dock';

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  return (
    <div
      className={`neuro-connect-banner ${
        docked
          ? 'neuro-connect-banner-docked flex flex-wrap'
          : 'premium-glass absolute top-24 left-1/2 -translate-x-1/2 flex'
      } items-center rounded-lg pointer-events-auto z-50`}
      style={{
        background: docked ? undefined : 'linear-gradient(135deg, rgba(8, 34, 46, 0.72), rgba(255,255,255,0.08))',
        border: docked ? undefined : '1px solid rgba(94, 234, 212, 0.26)',
        backdropFilter: docked ? undefined : 'blur(22px) saturate(1.7)',
        WebkitBackdropFilter: docked ? undefined : 'blur(22px) saturate(1.7)',
        padding: docked ? '5px 8px' : '8px 10px',
        gap: docked ? 7 : 10,
        width: docked ? '100%' : undefined,
      }}
    >
      <span
        className="text-[10px] tracking-wide"
        style={{ color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-instrument)' }}
      >
        Camera optional
      </span>

      <button
        type="button"
        onClick={enableCamera}
        disabled={connecting.camera || cameraActive}
        className={`${
          docked ? 'neuro-connect-choice' : 'glass-button'
        } text-[10px] border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105`}
        style={{
          fontFamily: 'var(--font-instrument)',
          borderColor: '#facc15',
          color: '#facc15',
          background: cameraActive ? 'rgba(250,204,21,0.13)' : 'rgba(250,204,21,0.06)',
          minHeight: docked ? 26 : undefined,
          padding: docked ? '4px 9px' : '7px 12px',
        }}
      >
        {connecting.camera ? 'Starting' : cameraActive ? 'Camera Ready' : 'Camera'}
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-sm cursor-pointer transition-all hover:scale-110"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        x
      </button>
    </div>
  );
}
