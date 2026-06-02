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
  const { eegConnected, cameraActive, mockEnabled, connecting } = useNeuroConnection();
  const [dismissed, setDismissed] = useState(false);

  const readyEnough = useDelayedTrue(cameraActive || mockEnabled || eegConnected, 600);
  if (dismissed || readyEnough) return null;
  const docked = variant === 'dock';

  const connectHeadband = async () => {
    await useNeuroStore.getState().connectHeadband();
  };

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  const enableMock = () => {
    useNeuroStore.getState().enableMock();
  };

  return (
    <div
      className={`premium-glass ${docked ? 'flex flex-wrap' : 'absolute top-24 left-1/2 -translate-x-1/2 flex'} items-center rounded-lg pointer-events-auto z-50`}
      style={{
        background: docked
          ? 'linear-gradient(135deg, rgba(10, 44, 52, 0.58), rgba(255,255,255,0.06))'
          : 'linear-gradient(135deg, rgba(8, 34, 46, 0.72), rgba(255,255,255,0.08))',
        border: docked ? '1px solid rgba(255, 236, 178, 0.16)' : '1px solid rgba(94, 234, 212, 0.26)',
        backdropFilter: 'blur(22px) saturate(1.7)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.7)',
        padding: docked ? '7px 9px' : '8px 10px',
        gap: 10,
        width: docked ? '100%' : undefined,
      }}
    >
      <span
        className="text-[11px] tracking-wide"
        style={{ color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-heading)' }}
      >
        Signals optional
      </span>

      <button
        type="button"
        onClick={enableCamera}
        disabled={connecting.camera || cameraActive}
        className="glass-button text-[11px] border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: '#facc15',
          color: '#facc15',
          background: cameraActive ? 'rgba(250,204,21,0.13)' : 'rgba(250,204,21,0.06)',
          padding: '7px 12px',
        }}
      >
        {connecting.camera ? 'Starting' : cameraActive ? 'Camera Ready' : 'Camera'}
      </button>

      <button
        type="button"
        onClick={connectHeadband}
        disabled={connecting.eeg || eegConnected}
        className="glass-button text-[11px] border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: 'rgba(94,234,212,0.45)',
          color: '#5eead4',
          background: eegConnected ? 'rgba(94,234,212,0.12)' : 'transparent',
          padding: '7px 12px',
        }}
      >
        {connecting.eeg ? 'Connecting' : eegConnected ? 'EEG Ready' : 'EEG'}
      </button>

      <button
        type="button"
        onClick={enableMock}
        className="glass-button text-[11px] border rounded-lg cursor-pointer transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: 'var(--color-text-secondary)',
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          padding: '7px 12px',
        }}
      >
        Sim
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
