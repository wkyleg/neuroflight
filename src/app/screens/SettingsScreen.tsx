import { useNavigate } from 'react-router';
import { DeviceConnect } from '@/app/ui/components/DeviceConnect.tsx';
import { useNeuroStore } from '@/neuro/store.ts';

export function SettingsScreen() {
  const navigate = useNavigate();

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
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 18 }}
        >
          Simulated Signal Presets
        </h3>
        <div className="grid grid-cols-3" style={{ gap: 10 }}>
          {[
            { label: 'Calm', preset: 'MEDITATION' as const, color: '#5eead4' },
            { label: 'Focused', preset: 'FOCUSED' as const, color: '#facc15' },
            { label: 'High Load', preset: 'EXCITED' as const, color: '#fb7185' },
          ].map((item) => (
            <button
              type="button"
              key={item.preset}
              onClick={() => useNeuroStore.getState().setMockPreset(item.preset)}
              className="cursor-pointer border text-xs font-bold transition-transform hover:scale-105"
              style={{
                borderColor: `${item.color}88`,
                color: item.color,
                background: `${item.color}12`,
                fontFamily: 'var(--font-heading)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
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
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}
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
            <span style={{ color: 'var(--color-text-primary)' }}>F / Click</span> — Tag
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
