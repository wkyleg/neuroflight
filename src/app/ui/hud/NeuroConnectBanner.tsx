import { useState } from 'react';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

export function NeuroConnectBanner() {
  const { eegConnected, cameraActive, mockEnabled, connecting } = useNeuroConnection();
  const [dismissed, setDismissed] = useState(false);

  const allConnected = (eegConnected && cameraActive) || mockEnabled;
  if (dismissed || allConnected) return null;

  const connectHeadband = async () => {
    await useNeuroStore.getState().connectHeadband();
  };

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  const enableMock = () => {
    useNeuroStore.getState().enableMock();
  };

  const hasAny = eegConnected || cameraActive;

  return (
    <div
      className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center rounded-lg pointer-events-auto z-50"
      style={{
        background: 'rgba(0, 10, 20, 0.72)',
        border: '1px solid rgba(0, 204, 204, 0.3)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        gap: 10,
      }}
    >
      <span
        className="text-xs tracking-wide"
        style={{ color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-heading)' }}
      >
        {hasAny ? 'Add signal:' : 'Signals optional:'}
      </span>

      <button
        type="button"
        onClick={connectHeadband}
        disabled={connecting.eeg || eegConnected}
        className="text-[11px] border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: 'var(--color-accent-cyan)',
          color: 'var(--color-accent-cyan)',
          background: eegConnected ? 'rgba(0,204,204,0.1)' : 'transparent',
          padding: '8px 14px',
        }}
      >
        {connecting.eeg ? 'Connecting' : eegConnected ? 'EEG Ready' : 'EEG'}
      </button>

      <button
        type="button"
        onClick={enableCamera}
        disabled={connecting.camera || cameraActive}
        className="text-[11px] border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: '#ffaa44',
          color: '#ffaa44',
          background: cameraActive ? 'rgba(255,170,68,0.1)' : 'transparent',
          padding: '8px 14px',
        }}
      >
        {connecting.camera ? 'Starting' : cameraActive ? 'Camera Ready' : 'Camera'}
      </button>

      {!hasAny && (
        <button
          type="button"
          onClick={enableMock}
          className="text-[11px] border rounded-lg cursor-pointer transition-all hover:scale-105"
          style={{
            fontFamily: 'var(--font-heading)',
            borderColor: 'var(--color-text-secondary)',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            padding: '8px 14px',
          }}
        >
          Sim
        </button>
      )}

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-sm cursor-pointer transition-all hover:scale-110"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ✕
      </button>
    </div>
  );
}
