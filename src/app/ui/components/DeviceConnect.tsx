import { v1Flags } from '@/config/v1Flags.ts';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

export function DeviceConnect() {
  const { eegConnected, cameraActive, wasmReady } = useNeuroConnection();
  const connecting = useNeuroStore((s) => s.connecting);
  const error = useNeuroStore((s) => s.error);

  const connectHeadband = async () => {
    await useNeuroStore.getState().connectHeadband();
  };

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  const disableCamera = () => {
    useNeuroStore.getState().disableCamera();
  };

  const enableMock = () => {
    useNeuroStore.getState().enableMock();
  };

  return (
    <div
      className="flex flex-col rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '28px 32px',
        gap: 20,
      }}
    >
      <h3
        className="text-xs tracking-widest uppercase font-semibold"
        style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
      >
        Camera Biofeedback
      </h3>

      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Webcam
          </span>
          <button
            type="button"
            onClick={cameraActive ? disableCamera : enableCamera}
            disabled={connecting.camera}
            className="text-xs border rounded-lg cursor-pointer disabled:cursor-not-allowed transition-all hover:scale-105"
            style={{
              fontFamily: 'var(--font-heading)',
              borderColor: cameraActive ? 'rgba(255,200,100,0.4)' : 'rgba(255,255,255,0.25)',
              color: cameraActive ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)',
              background: cameraActive ? 'rgba(255,200,100,0.08)' : 'transparent',
              padding: '10px 20px',
              opacity: connecting.camera ? 0.4 : 1,
            }}
          >
            {connecting.camera ? 'Enabling...' : cameraActive ? 'Active' : 'Enable'}
          </button>
        </div>

        {v1Flags.EEG_ENABLED && (
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              EEG Headband
            </span>
            <button
              type="button"
              onClick={connectHeadband}
              disabled={!wasmReady || connecting.eeg || eegConnected}
              className="text-xs border rounded-lg cursor-pointer disabled:cursor-not-allowed transition-all hover:scale-105"
              style={{
                fontFamily: 'var(--font-heading)',
                borderColor: eegConnected ? 'rgba(255,200,100,0.4)' : 'rgba(255,255,255,0.25)',
                color: eegConnected ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)',
                background: eegConnected ? 'rgba(255,200,100,0.08)' : 'transparent',
                padding: '10px 20px',
                opacity: !wasmReady || connecting.eeg ? 0.4 : 1,
              }}
            >
              {connecting.eeg ? 'Connecting...' : eegConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        )}

        {v1Flags.SIM_ENABLED && (
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              Mock Data
            </span>
            <button
              type="button"
              onClick={enableMock}
              className="text-xs border rounded-lg cursor-pointer transition-all hover:scale-105"
              style={{
                fontFamily: 'var(--font-heading)',
                borderColor: 'rgba(255,255,255,0.25)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                padding: '10px 20px',
              }}
            >
              Simulate
            </button>
          </div>
        )}
      </div>

      {error.eeg && (
        <p className="text-xs" style={{ color: '#ff4444' }}>
          {error.eeg}
        </p>
      )}
      {error.camera && (
        <p className="text-xs" style={{ color: '#ff4444' }}>
          {error.camera}
        </p>
      )}
    </div>
  );
}
