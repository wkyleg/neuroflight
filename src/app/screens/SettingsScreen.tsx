import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DeviceConnect } from '@/app/ui/components/DeviceConnect.tsx';
import { BINAURAL_ENABLED_KEY } from '@/game/core/ProceduralFlightMusicSystem.ts';

export function SettingsScreen() {
  const navigate = useNavigate();
  const [binauralEnabled, setBinauralEnabled] = useState(
    () => window.localStorage.getItem(BINAURAL_ENABLED_KEY) === 'true',
  );

  const toggleBinaural = () => {
    const next = !binauralEnabled;
    window.localStorage.setItem(BINAURAL_ENABLED_KEY, next ? 'true' : 'false');
    setBinauralEnabled(next);
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center overflow-y-auto relative"
      style={{
        paddingTop: 100,
        paddingBottom: 100,
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 20%, rgba(0,30,50,0.9) 0%, transparent 60%), radial-gradient(ellipse 100% 60% at 80% 80%, rgba(60,20,40,0.5) 0%, transparent 50%)',
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

      <h2
        className="text-4xl font-bold tracking-wider"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-accent-gold)', marginBottom: 60 }}
      >
        SETTINGS
      </h2>

      <div style={{ width: 420, marginBottom: 60 }}>
        <DeviceConnect />
      </div>

      <div
        className="rounded-xl"
        style={{
          width: 420,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.02)',
          padding: '28px 32px',
          marginBottom: 28,
        }}
      >
        <h3
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 14 }}
        >
          Optional Ambient Audio
        </h3>
        <button
          type="button"
          onClick={toggleBinaural}
          className="w-full cursor-pointer rounded-lg border text-left transition-all hover:scale-[1.01]"
          style={{
            borderColor: binauralEnabled ? 'rgba(94,234,212,0.46)' : 'rgba(255,255,255,0.16)',
            background: binauralEnabled ? 'rgba(94,234,212,0.08)' : 'rgba(255,255,255,0.03)',
            color: 'var(--color-text-primary)',
            padding: '14px 16px',
          }}
        >
          <span className="block text-sm font-bold">
            {binauralEnabled ? 'Binaural layer on' : 'Binaural layer off'}
          </span>
          <span className="mt-1 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.62)' }}>
            A quiet stereo ambience some people find pleasant. Best with headphones; no performance or wellness claim.
          </span>
        </button>
      </div>

      <div
        className="rounded-xl"
        style={{
          width: 420,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.02)',
          padding: '28px 32px',
          marginBottom: 60,
        }}
      >
        <h3
          className="text-xs tracking-widest uppercase font-semibold"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', marginBottom: 20 }}
        >
          In-Game Controls
        </h3>
        <div
          className="grid grid-cols-2"
          style={{ gap: '10px 32px', fontSize: 13, color: 'var(--color-text-secondary)' }}
        >
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

      <button
        type="button"
        onClick={() => navigate('/')}
        className="border rounded-lg tracking-wide cursor-pointer transition-all hover:scale-105"
        style={{
          fontFamily: 'var(--font-heading)',
          borderColor: 'rgba(255,255,255,0.25)',
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          padding: '14px 40px',
          fontSize: 15,
        }}
      >
        BACK
      </button>
    </div>
  );
}
