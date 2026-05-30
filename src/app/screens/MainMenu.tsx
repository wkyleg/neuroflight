import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getModeMeta, MODE_META } from '@/game/modes.ts';
import type { GameMode } from '@/game/types.ts';
import { MAPS } from '@/game/world/MapRegistry.ts';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

const MODE_ORDER: GameMode[] = ['zen', 'free', 'dogfight'];

export function MainMenu() {
  const navigate = useNavigate();
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [selectedMode, setSelectedMode] = useState<GameMode>('zen');
  const { eegConnected, cameraActive, connecting, mockEnabled } = useNeuroConnection();

  const map = useMemo(() => MAPS.find((m) => m.id === selectedMap) ?? MAPS[0], [selectedMap]);
  const mode = getModeMeta(selectedMode);
  const sensorReady = eegConnected || cameraActive || mockEnabled;

  const launchGame = () => {
    navigate(`/fly?mode=${selectedMode}&map=${selectedMap}`);
  };

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
    <main
      className="w-full h-full overflow-y-auto relative"
      style={{
        background: '#071016',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(7,16,22,0.16) 0%, rgba(7,16,22,0.76) 62%, rgba(7,16,22,0.96) 100%), url("/assets/sky/skyboxes/cloudy-panorama-06.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />
      <div
        className="fixed inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '48%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(63,42,24,0.32) 36%, rgba(8,28,28,0.84) 100%)',
        }}
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col px-6 py-8 md:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'rgba(240,236,224,0.72)', fontFamily: 'var(--font-mono)' }}
            >
              Neuroadaptive storybook aviation
            </p>
            <h1
              className="mt-2 text-5xl font-bold md:text-7xl"
              style={{ color: '#fff4ca', fontFamily: 'var(--font-heading)' }}
            >
              NeuroFlight
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/assets')}
              className="cursor-pointer border text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{
                borderColor: 'rgba(125,211,252,0.5)',
                color: '#bae6fd',
                background: 'rgba(8,47,73,0.44)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Asset Lab
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="cursor-pointer border text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{
                borderColor: 'rgba(255,244,202,0.36)',
                color: '#fff4ca',
                background: 'rgba(30,26,18,0.42)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Settings
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div>
            <p className="max-w-2xl text-lg leading-8 md:text-xl" style={{ color: 'rgba(255,248,226,0.86)' }}>
              Choose a quiet route, a landmark expedition, or a full dogfight. Sensors are optional; when they are on,
              the world responds gently to composure, recovery, and signal confidence.
            </p>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {MODE_ORDER.map((modeId) => {
                const item = MODE_META[modeId];
                const active = selectedMode === modeId;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedMode(item.id)}
                    className="min-h-[172px] cursor-pointer rounded-lg border text-left transition-transform hover:-translate-y-1 active:translate-y-0"
                    style={{
                      borderColor: active ? item.accent : 'rgba(255,255,255,0.16)',
                      background: active ? 'rgba(255,255,255,0.16)' : 'rgba(2,8,12,0.48)',
                      boxShadow: active ? `0 18px 50px ${item.accent}24` : 'none',
                      backdropFilter: 'blur(10px)',
                      padding: 22,
                    }}
                  >
                    <span
                      className="block text-xs uppercase tracking-widest"
                      style={{ color: active ? item.accent : 'rgba(240,236,224,0.58)', fontFamily: 'var(--font-mono)' }}
                    >
                      {item.scoreLabel}
                    </span>
                    <span
                      className="mt-3 block text-2xl font-bold"
                      style={{ color: '#fff8e2', fontFamily: 'var(--font-heading)' }}
                    >
                      {item.title}
                    </span>
                    <span className="mt-3 block text-sm leading-6" style={{ color: 'rgba(240,236,224,0.72)' }}>
                      {item.menuDescription}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={launchGame}
                className="cursor-pointer rounded-lg px-8 py-5 text-lg font-bold transition-transform hover:scale-105 active:scale-95"
                style={{
                  color: '#071016',
                  background: `linear-gradient(135deg, ${mode.accent} 0%, #fff4ca 100%)`,
                  border: '1px solid rgba(255,255,255,0.54)',
                  boxShadow: `0 18px 45px ${mode.accent}38`,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                Launch {mode.title}
              </button>
              <p className="max-w-sm text-sm leading-6" style={{ color: 'rgba(240,236,224,0.64)' }}>
                {sensorReady
                  ? 'Sensors are connected for adaptive ambience and debrief notes.'
                  : 'You can fly without sensors; simulated signals are available for testing.'}
              </p>
            </div>
          </div>

          <aside className="grid gap-5">
            <div
              className="rounded-lg border"
              style={{
                borderColor: 'rgba(255,244,202,0.18)',
                background: 'rgba(5,14,18,0.62)',
                backdropFilter: 'blur(12px)',
                padding: 24,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#facc15', fontFamily: 'var(--font-mono)' }}
              >
                Route
              </p>
              <h2 className="mt-2 text-3xl font-bold" style={{ color: '#fff8e2', fontFamily: 'var(--font-heading)' }}>
                {map.storyName ?? map.name}
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.72)' }}>
                {map.storyDescription ?? map.description}
              </p>
              <div className="mt-5 grid gap-3">
                {MAPS.map((candidate) => {
                  const active = candidate.id === selectedMap;
                  return (
                    <button
                      type="button"
                      key={candidate.id}
                      onClick={() => setSelectedMap(candidate.id)}
                      className="cursor-pointer rounded-lg border text-left transition-transform hover:translate-x-1"
                      style={{
                        borderColor: active ? '#facc15' : 'rgba(255,255,255,0.14)',
                        background: active ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.04)',
                        padding: '16px 18px',
                      }}
                    >
                      <span className="block font-bold" style={{ color: '#fff8e2', fontFamily: 'var(--font-heading)' }}>
                        {candidate.storyName ?? candidate.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.62)' }}>
                        {candidate.storyTagline ?? candidate.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-lg border"
              style={{
                borderColor: 'rgba(125,211,252,0.22)',
                background: 'rgba(3,24,32,0.58)',
                backdropFilter: 'blur(12px)',
                padding: 24,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#7dd3fc', fontFamily: 'var(--font-mono)' }}
              >
                Biofeedback
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={connectHeadband}
                  disabled={connecting.eeg || eegConnected}
                  className="cursor-pointer border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: eegConnected ? '#5eead4' : 'rgba(255,255,255,0.18)',
                    color: eegConnected ? '#5eead4' : '#dbeafe',
                    background: eegConnected ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {connecting.eeg ? 'Connecting' : eegConnected ? 'EEG Ready' : 'EEG'}
                </button>
                <button
                  type="button"
                  onClick={enableCamera}
                  disabled={connecting.camera || cameraActive}
                  className="cursor-pointer border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: cameraActive ? '#facc15' : 'rgba(255,255,255,0.18)',
                    color: cameraActive ? '#facc15' : '#dbeafe',
                    background: cameraActive ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.04)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {connecting.camera ? 'Starting' : cameraActive ? 'Camera Ready' : 'Camera'}
                </button>
                <button
                  type="button"
                  onClick={enableMock}
                  disabled={mockEnabled}
                  className="cursor-pointer border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: mockEnabled ? '#c4b5fd' : 'rgba(255,255,255,0.18)',
                    color: mockEnabled ? '#c4b5fd' : '#dbeafe',
                    background: mockEnabled ? 'rgba(196,181,253,0.12)' : 'rgba(255,255,255,0.04)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {mockEnabled ? 'Sim Ready' : 'Simulate'}
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
