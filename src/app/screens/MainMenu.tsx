import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_AIRCRAFT_ID, getAircraft, getAvailableAircraft } from '@/game/flight/AircraftRegistry.ts';
import { getModeMeta, MODE_META } from '@/game/modes.ts';
import type { GameDifficulty, GameMode } from '@/game/types.ts';
import { MAPS } from '@/game/world/MapRegistry.ts';
import { useNeuroConnection } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

type WizardStepId = 'mode' | 'aircraft' | 'challenge' | 'route' | 'biofeedback';

const MODE_ORDER: GameMode[] = ['zen', 'free', 'dogfight'];
const WIZARD_STEPS: Array<{ id: WizardStepId; label: string }> = [
  { id: 'mode', label: 'Mode' },
  { id: 'aircraft', label: 'Aircraft' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'route', label: 'Route' },
  { id: 'biofeedback', label: 'Readiness' },
];

const DIFFICULTY_OPTIONS: Array<{ id: GameDifficulty; label: string; description: string }> = [
  { id: 'rookie', label: 'Rookie', description: 'Forgiving rivals and softer scoring.' },
  { id: 'pilot', label: 'Pilot', description: 'Balanced arcade challenge.' },
  { id: 'ace', label: 'Ace', description: 'Sharper rivals and higher score ceiling.' },
];

const MODE_HELP: Record<GameMode, { short: string; detail: string; progress: string; sensors: string }> = {
  zen: {
    short: 'Follow glowing route gates at an easy pace.',
    detail:
      'Zen Flight is a calm route through clouds and landmarks. Aim through the next bright gate and keep the flight smooth.',
    progress: 'Progress comes from route gates, smooth streaks, and composed flying.',
    sensors: 'Camera biofeedback is optional and only shapes ambience and debrief notes.',
  },
  free: {
    short: 'Visit story landmarks and fly through nearby beacons.',
    detail:
      'Expedition highlights one story place at a time. Fly near the landmark, then through the floating beacon beside it.',
    progress: 'Progress comes from logged landmarks, low-pass routes, climb cues, and postcard moments.',
    sensors: 'Camera biofeedback is optional; the route remains fully playable without it.',
  },
  dogfight: {
    short: 'Fly a clear G-rated rival duel with bright fire trails.',
    detail:
      'Dogfight is playful aerial competition. Keep visual contact with the rival, use landmarks, and fire bright trails when lined up.',
    progress: 'Progress comes from wins, UFO bonuses, steady aim, and quick recoveries.',
    sensors: 'Camera biofeedback can add adaptive ambience, but it never changes challenge or scoring.',
  },
};

function stepIndex(step: WizardStepId): number {
  return WIZARD_STEPS.findIndex((item) => item.id === step);
}

function AircraftStatBar({ label, value }: { label: string; value: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="menu-stat-bar">
      <div className="menu-stat-bar-label">
        <span>{label}</span>
        <span>{filled}/5</span>
      </div>
      <div className="menu-stat-bar-track">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < filled ? 'is-filled' : ''} />
        ))}
      </div>
    </div>
  );
}

function AircraftPreview({ aircraftId, name }: { aircraftId: string; name: string }) {
  const kind = aircraftId.includes('ufo')
    ? 'ufo'
    : aircraftId.includes('il28') || aircraftId.includes('jet')
      ? 'jet'
      : aircraftId.includes('wright')
        ? 'wright'
        : aircraftId.includes('spitfire')
          ? 'fighter'
          : 'biplane';

  return (
    <div className={`menu-aircraft-preview menu-aircraft-preview-${kind}`}>
      <svg viewBox="0 0 280 150" role="img">
        <title>{name}</title>
        {kind === 'ufo' ? (
          <>
            <ellipse cx="140" cy="82" rx="88" ry="24" fill="rgba(196,181,253,0.76)" />
            <ellipse cx="140" cy="70" rx="48" ry="24" fill="rgba(94,234,212,0.58)" />
            <circle cx="102" cy="86" r="5" fill="#fff4ca" />
            <circle cx="140" cy="90" r="5" fill="#fff4ca" />
            <circle cx="178" cy="86" r="5" fill="#fff4ca" />
          </>
        ) : kind === 'wright' ? (
          <>
            <path d="M44 72 H236" stroke="rgba(255,244,202,0.86)" strokeWidth="8" strokeLinecap="round" />
            <path d="M64 94 H216" stroke="rgba(255,244,202,0.7)" strokeWidth="7" strokeLinecap="round" />
            <path d="M136 54 L150 104" stroke="rgba(94,234,212,0.66)" strokeWidth="5" />
            <path d="M92 70 L118 98 M188 70 L164 98" stroke="rgba(255,184,107,0.62)" strokeWidth="4" />
            <circle cx="154" cy="80" r="9" fill="#ffb86b" />
          </>
        ) : kind === 'jet' ? (
          <>
            <path d="M38 80 L176 50 L246 78 L176 106 Z" fill="rgba(186,230,253,0.72)" />
            <path d="M128 58 L152 22 L176 58 Z" fill="rgba(94,234,212,0.48)" />
            <path d="M124 100 L154 132 L182 104 Z" fill="rgba(251,113,133,0.45)" />
            <circle cx="86" cy="78" r="10" fill="rgba(255,244,202,0.7)" />
            <circle cx="202" cy="78" r="10" fill="rgba(255,244,202,0.7)" />
          </>
        ) : (
          <>
            <path
              d="M42 64 H230"
              stroke="rgba(255,244,202,0.78)"
              strokeWidth={kind === 'fighter' ? 10 : 12}
              strokeLinecap="round"
            />
            <path
              d="M56 96 H214"
              stroke="rgba(255,184,107,0.66)"
              strokeWidth={kind === 'fighter' ? 6 : 10}
              strokeLinecap="round"
            />
            <path d="M112 54 L150 22 L178 58 Z" fill="rgba(251,113,133,0.58)" />
            <path d="M112 104 L150 130 L178 104 Z" fill="rgba(94,234,212,0.42)" />
            <ellipse cx="142" cy="80" rx="40" ry="16" fill="rgba(255,111,100,0.72)" />
            <circle cx="238" cy="80" r="18" fill="none" stroke="rgba(255,244,202,0.72)" strokeWidth="5" />
          </>
        )}
      </svg>
      <div className="menu-aircraft-preview-glow" />
    </div>
  );
}

function RoutePreview({ mapId }: { mapId: string }) {
  const ocean = mapId === 'ocean_islands';
  return (
    <div className={`menu-route-preview ${ocean ? 'menu-route-preview-ocean' : 'menu-route-preview-desert'}`}>
      <div className="menu-route-sky" />
      <div className="menu-route-ground" />
      {ocean ? (
        <>
          <span className="menu-route-lighthouse" />
          <span className="menu-route-island one" />
          <span className="menu-route-island two" />
          <span className="menu-route-cloud one" />
          <span className="menu-route-cloud two" />
        </>
      ) : (
        <>
          <span className="menu-route-pyramid" />
          <span className="menu-route-arch" />
          <span className="menu-route-balloon" />
          <span className="menu-route-mesa one" />
          <span className="menu-route-mesa two" />
        </>
      )}
    </div>
  );
}

function SelectionButton({
  active,
  children,
  onClick,
  className = '',
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`menu-select-card ${active ? 'is-active' : ''} ${className}`}>
      {children}
    </button>
  );
}

export function MainMenu() {
  const navigate = useNavigate();
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [selectedMode, setSelectedMode] = useState<GameMode>('zen');
  const [selectedAircraft, setSelectedAircraft] = useState(DEFAULT_AIRCRAFT_ID);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('rookie');
  const [activeStep, setActiveStep] = useState<WizardStepId>('mode');
  const { cameraActive, connecting } = useNeuroConnection();

  const map = useMemo(() => MAPS.find((m) => m.id === selectedMap) ?? MAPS[0], [selectedMap]);
  const mode = getModeMeta(selectedMode);
  const aircraftOptions = useMemo(() => getAvailableAircraft(), []);
  const aircraft =
    aircraftOptions.find((option) => option.id === selectedAircraft) ??
    aircraftOptions[0] ??
    getAircraft(DEFAULT_AIRCRAFT_ID);
  const sensorReady = cameraActive;
  const sensorSummary = cameraActive ? 'Camera ready' : 'Behavior-only ready';
  const activeStepNumber = stepIndex(activeStep);

  const launchGame = () => {
    navigate(`/fly?mode=${selectedMode}&map=${selectedMap}&aircraft=${aircraft.id}&difficulty=${selectedDifficulty}`);
  };

  const launchTutorial = () => {
    navigate(`/fly?tutorial=1&mode=dogfight&map=${selectedMap}&aircraft=${aircraft.id}&difficulty=rookie`);
  };

  const enableCamera = async () => {
    await useNeuroStore.getState().enableCamera();
  };

  const goNext = () => {
    const next = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, activeStepNumber + 1)];
    setActiveStep(next.id);
  };

  return (
    <main className="neuroflight-menu neuroflight-menu-wizard">
      <div className="neuroflight-menu-bg" />
      <div className="neuroflight-menu-vignette" />

      <header className="menu-topbar premium-glass-strong">
        <button type="button" className="menu-logo" onClick={() => setActiveStep('mode')} aria-label="NeuroFlight home">
          NeuroFlight
        </button>
        <div className="menu-topbar-actions">
          <button type="button" onClick={() => navigate('/how-it-works')} className="glass-button menu-utility-button">
            How It Works
          </button>
          {import.meta.env.DEV && (
            <button type="button" onClick={() => navigate('/assets')} className="glass-button menu-utility-button">
              Asset Lab
            </button>
          )}
          <button type="button" onClick={() => navigate('/settings')} className="glass-button menu-utility-button">
            Settings
          </button>
          <button type="button" onClick={launchTutorial} className="glass-button menu-utility-button">
            Tutorial
          </button>
        </div>
      </header>

      <section className="menu-wizard-shell">
        <nav className="menu-stepper" aria-label="Launch setup steps">
          {WIZARD_STEPS.map((step, index) => {
            const active = step.id === activeStep;
            const complete = index < activeStepNumber;
            const summary =
              step.id === 'mode'
                ? mode.title
                : step.id === 'aircraft'
                  ? aircraft.name
                  : step.id === 'challenge'
                    ? selectedDifficulty
                    : step.id === 'route'
                      ? (map.storyName ?? map.name)
                      : sensorSummary;
            return (
              <button
                type="button"
                key={step.id}
                className={`menu-step ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}
                onClick={() => setActiveStep(step.id)}
              >
                <span className="menu-step-number">{complete ? '✓' : index + 1}</span>
                <span>
                  <span className="menu-step-label">{step.label}</span>
                  <span className="menu-step-summary">{summary}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="menu-step-panel premium-glass-strong">
          {activeStep === 'mode' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Choose flight style</p>
                <h1>How do you want to fly?</h1>
              </div>
              <div className="menu-mode-grid">
                {MODE_ORDER.map((modeId) => {
                  const item = MODE_META[modeId];
                  const active = selectedMode === modeId;
                  return (
                    <SelectionButton
                      key={item.id}
                      active={active}
                      onClick={() => {
                        setSelectedMode(item.id);
                      }}
                      className="menu-mode-card"
                    >
                      <span className="menu-card-kicker" style={{ color: active ? item.accent : undefined }}>
                        {item.scoreLabel}
                      </span>
                      <span className="menu-card-title">{item.title}</span>
                      <span className="menu-card-copy">{MODE_HELP[item.id].short}</span>
                      <span className="menu-card-small">{item.menuDescription}</span>
                    </SelectionButton>
                  );
                })}
              </div>
              <div className="menu-explainer">
                <p className="menu-card-kicker" style={{ color: mode.accent }}>
                  How {mode.title} works
                </p>
                <h2>{mode.title}</h2>
                <p>{MODE_HELP[selectedMode].detail}</p>
                <p>{MODE_HELP[selectedMode].progress}</p>
                <p>{MODE_HELP[selectedMode].sensors}</p>
              </div>
            </div>
          )}

          {activeStep === 'aircraft' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Choose aircraft</p>
                <h1>{aircraft.name}</h1>
              </div>
              <div className="menu-aircraft-layout">
                <AircraftPreview aircraftId={aircraft.id} name={aircraft.name} />
                <div className="menu-aircraft-detail">
                  <p className="menu-card-kicker">Aircraft</p>
                  <h2>{aircraft.name}</h2>
                  <p className="menu-card-copy">
                    {aircraft.handlingLabel ?? 'Verified flight profile'} · {aircraft.difficulty ?? 'standard'}
                  </p>
                  {aircraft.bestFor && <p className="menu-best-for">Best for: {aircraft.bestFor}</p>}
                  {aircraft.statBars && (
                    <div className="menu-stat-grid">
                      <AircraftStatBar label="Speed" value={aircraft.statBars.speed} />
                      <AircraftStatBar label="Handling" value={aircraft.statBars.handling} />
                      <AircraftStatBar label="Stability" value={aircraft.statBars.stability} />
                    </div>
                  )}
                  {aircraft.strengths && aircraft.strengths.length > 0 && (
                    <div className="menu-strengths">
                      {aircraft.strengths.map((strength) => (
                        <span key={strength}>{strength}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="menu-option-list">
                {aircraftOptions.map((option) => (
                  <SelectionButton
                    key={option.id}
                    active={option.id === aircraft.id}
                    onClick={() => setSelectedAircraft(option.id)}
                  >
                    <span className="menu-option-title">{option.name}</span>
                    <span className="menu-option-copy">{option.handlingLabel ?? option.era}</span>
                    {option.bestFor && <span className="menu-option-muted">{option.bestFor}</span>}
                  </SelectionButton>
                ))}
              </div>
            </div>
          )}

          {activeStep === 'challenge' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Set challenge</p>
                <h1>Pick the pace</h1>
              </div>
              <p className="menu-step-intro">
                {selectedMode === 'dogfight'
                  ? 'Dogfight challenge changes rival skill, hit tolerance, and score ceiling.'
                  : 'Challenge changes scoring pressure and flight assists while keeping the route friendly.'}
              </p>
              <div className="menu-option-list">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <SelectionButton
                    key={option.id}
                    active={option.id === selectedDifficulty}
                    onClick={() => setSelectedDifficulty(option.id)}
                  >
                    <span className="menu-option-title">{option.label}</span>
                    <span className="menu-option-copy">{option.description}</span>
                  </SelectionButton>
                ))}
              </div>
            </div>
          )}

          {activeStep === 'route' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Choose route</p>
                <h1>{map.storyName ?? map.name}</h1>
              </div>
              <div className="menu-route-layout">
                <RoutePreview mapId={map.id} />
                <div className="menu-route-detail">
                  <p className="menu-card-kicker">Route</p>
                  <h2>{map.storyName ?? map.name}</h2>
                  <p>{map.storyDescription ?? map.description}</p>
                </div>
              </div>
              <div className="menu-option-list">
                {MAPS.map((candidate) => (
                  <SelectionButton
                    key={candidate.id}
                    active={candidate.id === selectedMap}
                    onClick={() => setSelectedMap(candidate.id)}
                  >
                    <span className="menu-option-title">{candidate.storyName ?? candidate.name}</span>
                    <span className="menu-option-copy">{candidate.storyTagline ?? candidate.description}</span>
                  </SelectionButton>
                ))}
              </div>
            </div>
          )}

          {activeStep === 'biofeedback' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Readiness check</p>
                <h1>Camera optional, flight ready</h1>
              </div>
              <p className="menu-step-intro">
                NeuroFlight can use your webcam to estimate pulse trends during play. Processing stays local, and you
                can continue behavior-only whenever the signal is unavailable.
              </p>
              <div className="menu-biofeedback-grid">
                <SelectionButton active={cameraActive} onClick={enableCamera}>
                  <span className="menu-option-title">
                    {connecting.camera ? 'Starting camera' : cameraActive ? 'Camera ready' : 'Camera'}
                  </span>
                  <span className="menu-option-copy">Use webcam signal quality and coverage for debrief insight.</span>
                </SelectionButton>
                <SelectionButton active={!cameraActive} onClick={launchGame}>
                  <span className="menu-option-title">Continue behavior-only</span>
                  <span className="menu-option-copy">Play the same scored session without camera insights.</span>
                </SelectionButton>
              </div>
            </div>
          )}

          <div className="menu-step-actions">
            <button
              type="button"
              className="glass-button menu-secondary-action"
              onClick={() => setActiveStep(WIZARD_STEPS[Math.max(0, activeStepNumber - 1)].id)}
              disabled={activeStepNumber === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="glass-button menu-primary-action"
              onClick={activeStepNumber === WIZARD_STEPS.length - 1 ? launchGame : goNext}
              style={{ background: `linear-gradient(135deg, ${mode.accent} 0%, #fff4ca 100%)` }}
            >
              {activeStepNumber === WIZARD_STEPS.length - 1 ? `Launch ${mode.title}` : 'Next'}
            </button>
          </div>
        </div>
      </section>

      <footer className="menu-launch-footer premium-glass-strong">
        <div className="menu-launch-summary">
          <p>Ready to fly</p>
          <strong>
            {mode.title} · {map.storyName ?? map.name} · {aircraft.name} · {selectedDifficulty}
          </strong>
          <span>
            {sensorReady
              ? `${sensorSummary} for adaptive ambience and debrief notes.`
              : 'No camera setup required; behavior-only play is always available.'}
          </span>
        </div>
        <button
          type="button"
          onClick={launchGame}
          className="glass-button menu-footer-launch"
          style={{ background: `linear-gradient(135deg, ${mode.accent} 0%, #fff4ca 100%)` }}
        >
          Launch {mode.title}
        </button>
      </footer>
    </main>
  );
}
