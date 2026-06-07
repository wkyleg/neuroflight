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

const MODE_HELP: Record<GameMode, { short: string; icon: string }> = {
  zen: {
    icon: 'Z',
    short: 'Follow glowing route gates at an easy pace.',
  },
  free: {
    icon: 'E',
    short: 'Visit story landmarks and fly through nearby beacons.',
  },
  dogfight: {
    icon: 'D',
    short: 'Fly a clear G-rated rival duel with bright fire trails.',
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
                      <span className="menu-card-title menu-mode-title">
                        <span className="menu-mode-icon" aria-hidden="true">
                          {MODE_HELP[item.id].icon}
                        </span>
                        {item.title}
                      </span>
                      <span className="menu-card-copy">{MODE_HELP[item.id].short}</span>
                      <span className="menu-card-small">{item.menuDescription}</span>
                    </SelectionButton>
                  );
                })}
              </div>
            </div>
          )}

          {activeStep === 'aircraft' && (
            <div className="menu-step-content">
              <div className="menu-step-heading">
                <p>Choose aircraft</p>
                <h1>Pick your plane</h1>
              </div>
              <div className="menu-aircraft-list">
                {aircraftOptions.map((option) => (
                  <SelectionButton
                    key={option.id}
                    active={option.id === aircraft.id}
                    onClick={() => setSelectedAircraft(option.id)}
                    className="menu-aircraft-row"
                  >
                    <span>
                      <span className="menu-option-title">{option.name}</span>
                      <span className="menu-option-copy">
                        {option.handlingLabel ?? 'Verified flight profile'} · {option.bestFor ?? option.era}
                      </span>
                    </span>
                    {option.statBars && (
                      <span className="menu-aircraft-row-stats">
                        <AircraftStatBar label="Speed" value={option.statBars.speed} />
                        <AircraftStatBar label="Handling" value={option.statBars.handling} />
                        <AircraftStatBar label="Stability" value={option.statBars.stability} />
                      </span>
                    )}
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
              <div className="menu-option-list menu-option-list-compact">
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
                <h1>Choose route</h1>
              </div>
              <div className="menu-option-list menu-option-list-compact">
                {MAPS.map((candidate) => (
                  <SelectionButton
                    key={candidate.id}
                    active={candidate.id === selectedMap}
                    onClick={() => setSelectedMap(candidate.id)}
                  >
                    <span className="menu-option-title">{candidate.storyName ?? candidate.name}</span>
                    <span className="menu-option-copy">{candidate.storyTagline ?? candidate.description}</span>
                    {candidate.id === selectedMap && (
                      <span className="menu-option-muted">{candidate.storyDescription ?? candidate.description}</span>
                    )}
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
          <strong>
            {mode.title} · {map.storyName ?? map.name} · {aircraft.name} · {selectedDifficulty}
          </strong>
          <span>{sensorReady ? sensorSummary : 'Behavior-only · no camera required'}</span>
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
