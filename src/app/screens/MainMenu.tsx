import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_AIRCRAFT_ID, getAircraft, getAvailableAircraft } from '@/game/flight/AircraftRegistry.ts';
import { getModeMeta, MODE_META } from '@/game/modes.ts';
import type { GameDifficulty, GameMode } from '@/game/types.ts';
import { MAPS } from '@/game/world/MapRegistry.ts';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

const MODE_ORDER: GameMode[] = ['zen', 'free', 'dogfight'];
const DIFFICULTY_OPTIONS: Array<{ id: GameDifficulty; label: string; description: string }> = [
  { id: 'rookie', label: 'Rookie', description: 'Forgiving rivals and softer scoring.' },
  { id: 'pilot', label: 'Pilot', description: 'Balanced arcade challenge.' },
  { id: 'ace', label: 'Ace', description: 'Sharper rivals and higher score ceiling.' },
];

const MODE_HELP: Record<GameMode, string> = {
  zen: 'Follow glowing route gates at an easy pace. Best when you want calm flight practice.',
  free: 'Visit one highlighted landmark at a time. Fly through the beacon beside each story place.',
  dogfight: 'Fly a G-rated rival duel with bright fire trails. Rookie keeps the chase forgiving.',
};

function AircraftStatBar({ label, value }: { label: string; value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
        <span style={{ color: 'rgba(240,236,224,0.64)' }}>{label}</span>
        <span style={{ color: '#fff4ca' }}>{filled}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="h-2 rounded-full"
            style={{
              background: index < filled ? 'linear-gradient(90deg, #5eead4 0%, #facc15 100%)' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MainMenu() {
  const navigate = useNavigate();
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [selectedMode, setSelectedMode] = useState<GameMode>('zen');
  const [selectedAircraft, setSelectedAircraft] = useState(DEFAULT_AIRCRAFT_ID);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('rookie');
  const { eegConnected, cameraActive, connecting, mockEnabled } = useNeuroConnection();

  const map = useMemo(() => MAPS.find((m) => m.id === selectedMap) ?? MAPS[0], [selectedMap]);
  const mode = getModeMeta(selectedMode);
  const aircraftOptions = useMemo(() => getAvailableAircraft(), []);
  const aircraft =
    aircraftOptions.find((option) => option.id === selectedAircraft) ??
    aircraftOptions[0] ??
    getAircraft(DEFAULT_AIRCRAFT_ID);
  const sensorReady = eegConnected || cameraActive || mockEnabled;

  const launchGame = () => {
    navigate(`/fly?mode=${selectedMode}&map=${selectedMap}&aircraft=${aircraft.id}&difficulty=${selectedDifficulty}`);
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

      <div
        className="relative mx-auto flex min-h-full w-full flex-col py-7"
        style={{
          maxWidth: 1360,
          paddingLeft: 'clamp(32px, 4vw, 72px)',
          paddingRight: 'clamp(32px, 4vw, 72px)',
        }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'rgba(240,236,224,0.72)', fontFamily: 'var(--font-body)' }}
            >
              Neuroadaptive storybook aviation
            </p>
            <h1
              className="mt-2 text-5xl font-bold md:text-6xl lg:text-7xl"
              style={{ color: '#fff4ca', fontFamily: 'var(--font-heading)', lineHeight: 0.9 }}
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

        <section className="grid flex-1 items-start gap-6 pb-32 pt-7 lg:grid-cols-[minmax(420px,0.95fr)_minmax(480px,0.85fr)] lg:pt-9">
          <div>
            <p className="max-w-2xl text-base leading-7 md:text-lg" style={{ color: 'rgba(255,248,226,0.86)' }}>
              Choose a calm route, a landmark expedition, or a playful dogfight. Sensors are optional; the flight is
              ready whenever you are.
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {MODE_ORDER.map((modeId) => {
                const item = MODE_META[modeId];
                const active = selectedMode === modeId;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedMode(item.id)}
                    className="min-h-[150px] cursor-pointer rounded-lg border text-left transition-transform hover:-translate-y-1 active:translate-y-0"
                    style={{
                      borderColor: active ? item.accent : 'rgba(255,255,255,0.16)',
                      background: active ? 'rgba(255,255,255,0.16)' : 'rgba(2,8,12,0.48)',
                      boxShadow: active ? `0 18px 50px ${item.accent}24` : 'none',
                      backdropFilter: 'blur(10px)',
                      padding: 18,
                    }}
                  >
                    <span
                      className="block text-xs uppercase tracking-widest"
                      style={{ color: active ? item.accent : 'rgba(240,236,224,0.58)', fontFamily: 'var(--font-body)' }}
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

            <div
              className="mt-6 rounded-xl border"
              style={{
                borderColor: `${mode.accent}55`,
                background: 'rgba(3,18,24,0.54)',
                padding: 18,
                backdropFilter: 'blur(12px)',
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: mode.accent, fontFamily: 'var(--font-body)' }}
              >
                How {mode.title} works
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,248,226,0.76)' }}>
                {MODE_HELP[selectedMode]}
              </p>
            </div>
          </div>

          <aside className="grid gap-4">
            <div
              className="rounded-lg border"
              style={{
                borderColor: 'rgba(94,234,212,0.22)',
                background: 'rgba(4,28,32,0.58)',
                backdropFilter: 'blur(12px)',
                padding: 20,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#5eead4', fontFamily: 'var(--font-body)' }}
              >
                Aircraft
              </p>
              <h2 className="mt-2 text-2xl font-bold" style={{ color: '#fff8e2', fontFamily: 'var(--font-heading)' }}>
                {aircraft.name}
              </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.68)' }}>
                {aircraft.handlingLabel ?? 'Verified flight profile'} · {aircraft.difficulty ?? 'standard'}
              </p>
              {aircraft.bestFor && (
                <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(255,248,226,0.78)' }}>
                  Best for: {aircraft.bestFor}
                </p>
              )}
              {aircraft.statBars && (
                <div className="mt-4 grid gap-3">
                  <AircraftStatBar label="Speed" value={aircraft.statBars.speed} />
                  <AircraftStatBar label="Handling" value={aircraft.statBars.handling} />
                  <AircraftStatBar label="Stability" value={aircraft.statBars.stability} />
                </div>
              )}
              {aircraft.strengths && aircraft.strengths.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {aircraft.strengths.map((strength) => (
                    <span
                      key={strength}
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{
                        borderColor: 'rgba(94,234,212,0.22)',
                        color: '#ccfbf1',
                        background: 'rgba(94,234,212,0.08)',
                      }}
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 grid gap-2">
                {aircraftOptions.map((option) => {
                  const active = option.id === aircraft.id;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setSelectedAircraft(option.id)}
                      className="cursor-pointer rounded-lg border text-left transition-transform hover:translate-x-1"
                      style={{
                        borderColor: active ? '#5eead4' : 'rgba(255,255,255,0.14)',
                        background: active ? 'rgba(94,234,212,0.12)' : 'rgba(255,255,255,0.04)',
                        padding: '12px 14px',
                      }}
                    >
                      <span className="block text-sm font-bold" style={{ color: '#fff8e2' }}>
                        {option.name}
                      </span>
                      <span className="mt-1 block text-xs" style={{ color: 'rgba(240,236,224,0.58)' }}>
                        {option.handlingLabel ?? option.era}
                      </span>
                      {option.bestFor && (
                        <span className="mt-1 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.5)' }}>
                          {option.bestFor}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-lg border"
              style={{
                borderColor: 'rgba(255,255,255,0.16)',
                background: 'rgba(5,14,18,0.54)',
                backdropFilter: 'blur(12px)',
                padding: 18,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#facc15', fontFamily: 'var(--font-body)' }}
              >
                Challenge
              </p>
              <div className="mt-3 grid gap-2">
                {DIFFICULTY_OPTIONS.map((option) => {
                  const active = option.id === selectedDifficulty;
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setSelectedDifficulty(option.id)}
                      className="cursor-pointer rounded-lg border text-left transition-transform hover:translate-x-1"
                      style={{
                        borderColor: active ? '#facc15' : 'rgba(255,255,255,0.14)',
                        background: active ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.04)',
                        padding: '10px 12px',
                      }}
                    >
                      <span className="block text-sm font-bold" style={{ color: '#fff8e2' }}>
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.58)' }}>
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-lg border"
              style={{
                borderColor: 'rgba(255,244,202,0.18)',
                background: 'rgba(5,14,18,0.62)',
                backdropFilter: 'blur(12px)',
                padding: 20,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#facc15', fontFamily: 'var(--font-body)' }}
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
                padding: 18,
              }}
            >
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: '#7dd3fc', fontFamily: 'var(--font-body)' }}
              >
                Biofeedback
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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

        <div
          className="sticky bottom-0 z-20 -mx-2 mt-auto rounded-t-2xl border px-4 py-3"
          style={{
            background: 'linear-gradient(180deg, rgba(7,24,30,0.82), rgba(5,14,18,0.96))',
            borderColor: 'rgba(255,248,226,0.16)',
            backdropFilter: 'blur(18px) saturate(1.25)',
            boxShadow: '0 -18px 50px rgba(0,0,0,0.28)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: mode.accent, fontFamily: 'var(--font-body)' }}
              >
                Ready to fly
              </p>
              <p className="mt-1 text-sm leading-6" style={{ color: 'rgba(255,248,226,0.82)' }}>
                {mode.title} · {map.storyName ?? map.name} · {aircraft.name} · {selectedDifficulty}
              </p>
              <p className="text-xs leading-5" style={{ color: 'rgba(240,236,224,0.6)' }}>
                {sensorReady
                  ? 'Biofeedback is connected for adaptive ambience and debrief notes.'
                  : 'No sensor setup required; camera and simulation are optional.'}
              </p>
            </div>
            <button
              type="button"
              onClick={launchGame}
              className="cursor-pointer rounded-xl px-8 py-4 text-base font-bold transition-transform hover:scale-105 active:scale-95"
              style={{
                color: '#071016',
                background: `linear-gradient(135deg, ${mode.accent} 0%, #fff4ca 100%)`,
                border: '1px solid rgba(255,255,255,0.58)',
                boxShadow: `0 18px 45px ${mode.accent}38`,
                fontFamily: 'var(--font-heading)',
                minWidth: 220,
              }}
            >
              Launch {mode.title}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
