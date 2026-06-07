import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { DeviceConnect } from '@/app/ui/components/DeviceConnect.tsx';
import { BINAURAL_ENABLED_KEY } from '@/game/core/ProceduralFlightMusicSystem.ts';
import { useGameStore } from '@/stores/gameStore.ts';

export function SettingsScreen() {
  const navigate = useNavigate();
  const game = useGameStore((state) => state.game);
  const [binauralEnabled, setBinauralEnabled] = useState(
    () => game?.isBinauralEnabled() ?? window.localStorage.getItem(BINAURAL_ENABLED_KEY) !== 'false',
  );

  useEffect(() => {
    if (game) setBinauralEnabled(game.isBinauralEnabled());
  }, [game]);

  const toggleBinaural = () => {
    const next = !binauralEnabled;
    if (game) {
      game.setBinauralEnabled(next);
    } else {
      window.localStorage.setItem(BINAURAL_ENABLED_KEY, next ? 'true' : 'false');
    }
    setBinauralEnabled(next);
  };

  return (
    <main className="neuroflight-menu neuroflight-settings-screen">
      <section className="neuroflight-settings-panel premium-glass-strong">
        <h1>Settings</h1>

        <div className="neuroflight-settings-card">
          <DeviceConnect />
        </div>

        <div className="neuroflight-settings-card">
          <h2>Optional Ambient Audio</h2>
          <button
            type="button"
            onClick={toggleBinaural}
            className="neuroflight-settings-toggle"
            style={{
              borderColor: binauralEnabled ? 'rgba(94,234,212,0.46)' : 'rgba(255,255,255,0.16)',
              background: binauralEnabled ? 'rgba(94,234,212,0.08)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <span>{binauralEnabled ? 'Binaural layer on' : 'Binaural layer off'}</span>
            <small>
              A quiet stereo ambience some people find pleasant. Best with headphones; no performance or wellness claim.
            </small>
          </button>
        </div>

        <div className="neuroflight-settings-card">
          <h2>In-Game Controls</h2>
          <div className="neuroflight-settings-controls">
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>W/S or ↑/↓</span> — Pitch
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>A/D or ←/→</span> — Roll
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>Q / E</span> — Yaw
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>Shift / Ctrl</span> — Throttle
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>Space</span> — Boost
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>B</span> — Brake
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>]</span> — Switch Aircraft
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>[</span> — Switch Environment
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>R</span> — Restart
            </div>
            <div>
              <span style={{ color: 'var(--color-text-primary)' }}>F / Click</span> — Fire
            </div>
          </div>
        </div>

        <button type="button" onClick={() => navigate('/')} className="glass-button neuroflight-settings-back">
          BACK
        </button>
      </section>
    </main>
  );
}
