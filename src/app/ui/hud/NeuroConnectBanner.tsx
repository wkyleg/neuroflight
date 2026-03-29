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
      className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center rounded-xl pointer-events-auto z-50"
      style={{
        background: 'rgba(0, 10, 20, 0.85)',
        border: '1px solid rgba(0, 204, 204, 0.3)',
        backdropFilter: 'blur(8px)',
        padding: '20px 40px',
        gap: 20,
      }}
    >
      <span
        className="text-sm tracking-wide"
        style={{ color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-heading)' }}
      >
        {hasAny ? 'Add another device:' : 'Connect a neuro device:'}
      </span>

      <button
        type="button"
        onClick={connectHeadband}
        disabled={connecting.eeg || eegConnected}
        className="px-6 py-3 text-xs border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: 'var(--color-accent-cyan)',
          color: 'var(--color-accent-cyan)',
          background: eegConnected ? 'rgba(0,204,204,0.1)' : 'transparent',
        }}
      >
        {connecting.eeg ? 'Connecting...' : eegConnected ? 'EEG ✓' : 'EEG Headband'}
      </button>

      <button
        type="button"
        onClick={enableCamera}
        disabled={connecting.camera || cameraActive}
        className="px-6 py-3 text-xs border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: '#ffaa44',
          color: '#ffaa44',
          background: cameraActive ? 'rgba(255,170,68,0.1)' : 'transparent',
        }}
      >
        {connecting.camera ? 'Enabling...' : cameraActive ? 'Camera ✓' : 'Camera (rPPG)'}
      </button>

      {!hasAny && (
        <button
          type="button"
          onClick={enableMock}
          className="px-6 py-3 text-xs border rounded-lg cursor-pointer transition-all hover:scale-105"
          style={{
            fontFamily: 'var(--font-heading)',
            borderColor: 'var(--color-text-secondary)',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
          }}
        >
          Simulate
        </button>
      )}

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-3 text-sm cursor-pointer transition-all hover:scale-110"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ✕
      </button>
    </div>
  );
}
