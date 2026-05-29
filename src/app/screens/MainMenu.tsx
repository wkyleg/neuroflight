import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MAPS } from '@/game/world/MapRegistry.ts';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

export function MainMenu() {
  const navigate = useNavigate();
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const { eegConnected, cameraActive, connecting } = useNeuroConnection();

  const launchGame = () => {
    navigate(`/fly?mode=dogfight&map=${selectedMap}`);
  };

  const connectHeadband = async () => {
    await useNeuroStore.getState().connectHeadband();
  };

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center overflow-y-auto relative"
      style={{
        paddingTop: 120,
        paddingBottom: 120,
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      {/* Fixed background layers */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 140% 50% at 50% 60%, rgba(0,40,60,0.6) 0%, transparent 50%), radial-gradient(ellipse 100% 60% at 80% 90%, rgba(60,20,40,0.4) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 10% 80%, rgba(0,50,70,0.3) 0%, transparent 50%)',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,204,204,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,204,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <h1
        className="text-6xl font-bold tracking-wider"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-accent-gold)', marginBottom: 16 }}
      >
        NEUROFLIGHT
      </h1>
      <p
        className="text-lg"
        style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 80 }}
      >
        Neuroadaptive Flight Experience
      </p>

      {/* Neuro device connection panel */}
      <div style={{ marginBottom: 72, width: 460 }}>
        <span
          className="block text-xs tracking-widest uppercase"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}
        >
          Connect Devices
        </span>
        <div
          className="flex flex-col rounded-xl"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
            padding: '28px 32px',
            gap: 20,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              EEG Headband
            </span>
            {eegConnected ? (
              <span
                className="text-xs rounded-lg font-medium"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-accent-gold)',
                  border: '1px solid rgba(255,200,100,0.4)',
                  background: 'rgba(255,200,100,0.08)',
                  padding: '10px 20px',
                }}
              >
                Connected
              </span>
            ) : (
              <button
                type="button"
                onClick={connectHeadband}
                disabled={connecting.eeg}
                className="text-xs border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                style={{
                  fontFamily: 'var(--font-heading)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'var(--color-text-secondary)',
                  background: 'transparent',
                  padding: '12px 24px',
                }}
              >
                {connecting.eeg ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              Camera (rPPG)
            </span>
            {cameraActive ? (
              <span
                className="text-xs rounded-lg font-medium"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-accent-gold)',
                  border: '1px solid rgba(255,200,100,0.4)',
                  background: 'rgba(255,200,100,0.08)',
                  padding: '10px 20px',
                }}
              >
                Active
              </span>
            ) : (
              <button
                type="button"
                onClick={enableCamera}
                disabled={connecting.camera}
                className="text-xs border rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
                style={{
                  fontFamily: 'var(--font-heading)',
                  borderColor: 'rgba(255,255,255,0.25)',
                  color: 'var(--color-text-secondary)',
                  background: 'transparent',
                  padding: '12px 24px',
                }}
              >
                {connecting.camera ? 'Enabling...' : 'Enable'}
              </button>
            )}
          </div>
          {!eegConnected && !cameraActive && (
            <p className="text-[10px] opacity-50" style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Optional — fly without devices or connect for biofeedback
            </p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 72, width: 460 }}>
        <span
          className="block text-xs tracking-widest uppercase"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}
        >
          Select Map
        </span>
        <div className="flex flex-col" style={{ gap: 12 }}>
          {MAPS.map((map) => (
            <button
              type="button"
              key={map.id}
              onClick={() => setSelectedMap(map.id)}
              className="text-left border rounded-lg transition-all duration-150 cursor-pointer"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: selectedMap === map.id ? 'var(--color-accent-gold)' : 'rgba(255,255,255,0.15)',
                color: selectedMap === map.id ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)',
                background: selectedMap === map.id ? 'rgba(255,200,100,0.08)' : 'transparent',
                padding: '20px 24px',
              }}
            >
              <span className="block text-sm font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                {map.name}
              </span>
              <span className="block text-xs opacity-70" style={{ marginTop: 4 }}>
                {map.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 20, width: 460 }}>
        <button
          type="button"
          onClick={launchGame}
          className="rounded-lg text-xl tracking-widest transition-all duration-200 hover:scale-105 cursor-pointer font-bold"
          style={{
            fontFamily: 'var(--font-heading)',
            color: '#ffffff',
            background: 'linear-gradient(135deg, rgba(255,60,60,0.85) 0%, rgba(200,30,30,0.9) 100%)',
            border: '1px solid rgba(255,100,100,0.4)',
            boxShadow: '0 4px 20px rgba(255,50,50,0.3)',
            padding: '22px 32px',
          }}
        >
          LAUNCH DOGFIGHT
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="border rounded-lg text-sm tracking-wide transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{
            fontFamily: 'var(--font-body)',
            borderColor: 'var(--color-text-secondary)',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            padding: '16px 32px',
          }}
        >
          SETTINGS
        </button>
        <button
          type="button"
          onClick={() => navigate('/assets')}
          className="border rounded-lg text-sm tracking-wide transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{
            fontFamily: 'var(--font-body)',
            borderColor: 'rgba(0,204,204,0.45)',
            color: 'var(--color-accent-cyan)',
            background: 'rgba(0,204,204,0.06)',
            padding: '16px 32px',
          }}
        >
          ASSET LAB
        </button>
      </div>
    </div>
  );
}
