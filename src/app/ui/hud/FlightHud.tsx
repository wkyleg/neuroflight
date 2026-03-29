import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore.ts';
import { NeuroCockpit } from './NeuroCockpit.tsx';
import { NeuroConnectBanner } from './NeuroConnectBanner.tsx';

function ControlsLegend({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <button
      type="button"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl pointer-events-auto z-50 text-left cursor-pointer"
      onClick={onDismiss}
      style={{
        background: 'rgba(0, 5, 15, 0.92)',
        border: '1px solid rgba(255, 200, 100, 0.3)',
        backdropFilter: 'blur(12px)',
        padding: '40px 48px',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <h3
        className="text-sm font-bold tracking-widest text-center"
        style={{ color: 'var(--color-accent-gold)', fontFamily: 'var(--font-heading)', marginBottom: 24 }}
      >
        HOW TO FLY
      </h3>
      <div className="grid grid-cols-2 text-[12px]" style={{ color: 'var(--color-text-secondary)', gap: '14px 48px' }}>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>W / ↑</span> &mdash; Pitch up
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>S / ↓</span> &mdash; Pitch down
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>A / ←</span> &mdash; Roll left
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>D / →</span> &mdash; Roll right
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>Q / E</span> &mdash; Yaw
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>Shift</span> &mdash; Throttle up
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>Ctrl</span> &mdash; Throttle down
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>B</span> &mdash; Brake
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <span style={{ color: '#ff4444' }}>Space / Enter</span> &mdash; Fire
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <span style={{ color: 'var(--color-text-primary)' }}>Click</span> &mdash; Fire
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>R</span> &mdash; Restart
        </div>
        <div>
          <span style={{ color: 'var(--color-text-primary)' }}>Esc</span> &mdash; Pause
        </div>
      </div>
      <p
        className="text-center text-[10px] tracking-widest cursor-pointer transition-opacity hover:opacity-100"
        style={{ color: 'var(--color-text-secondary)', opacity: 0.5, marginTop: 24 }}
      >
        CLICK ANYWHERE TO DISMISS
      </p>
    </button>
  );
}

function DirectionIndicator({ dir, color, label }: { dir: { x: number; y: number }; color: string; label?: string }) {
  const angle = Math.atan2(-dir.x, dir.y);
  const cx = 50 + Math.sin(angle + Math.PI) * 38;
  const cy = 50 - Math.cos(angle + Math.PI) * 38;
  const arrowTip = { x: cx, y: cy };
  const arrowBase1 = {
    x: cx - Math.cos(angle + Math.PI) * 6 + Math.sin(angle + Math.PI) * 4,
    y: cy - Math.sin(angle + Math.PI) * 6 - Math.cos(angle + Math.PI) * 4,
  };
  const arrowBase2 = {
    x: cx - Math.cos(angle + Math.PI) * 6 - Math.sin(angle + Math.PI) * 4,
    y: cy - Math.sin(angle + Math.PI) * 6 + Math.cos(angle + Math.PI) * 4,
  };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <title>{label ? `${label} direction` : 'Direction indicator'}</title>
        <circle cx="50" cy="50" r="44" fill="none" stroke={`${color}20`} strokeWidth="1" />
        <circle cx="50" cy="50" r="44" fill="none" stroke={`${color}40`} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="50" y1="6" x2="50" y2="14" stroke={`${color}30`} strokeWidth="1" />
        <line x1="50" y1="86" x2="50" y2="94" stroke={`${color}30`} strokeWidth="1" />
        <line x1="6" y1="50" x2="14" y2="50" stroke={`${color}30`} strokeWidth="1" />
        <line x1="86" y1="50" x2="94" y2="50" stroke={`${color}30`} strokeWidth="1" />
        <polygon
          points={`${arrowTip.x},${arrowTip.y} ${arrowBase1.x},${arrowBase1.y} ${arrowBase2.x},${arrowBase2.y}`}
          fill={color}
          opacity="0.9"
        />
        {label && (
          <text x="50" y="53" textAnchor="middle" fill={`${color}80`} fontSize="7" fontFamily="var(--font-mono)">
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

function HealthBar({
  value,
  max,
  label,
  color,
  large,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
  large?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barW = large ? 220 : 160;
  const barH = large ? 16 : 12;
  const fontSize = large ? 14 : 12;
  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <span
        className="tracking-widest text-right font-bold"
        style={{ color: 'var(--color-text-secondary)', width: 64, fontFamily: 'var(--font-heading)', fontSize }}
      >
        {label}
      </span>
      <div
        className="rounded-full relative"
        style={{
          background: 'rgba(255,255,255,0.1)',
          width: barW,
          height: barH,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, background: pct > 40 ? color : '#ff4444' }}
        />
      </div>
      <span className="font-bold tabular-nums" style={{ color, width: 40, fontSize }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

function DamageFlash({ playerHealth }: { playerHealth: number }) {
  const [flash, setFlash] = useState(false);
  const [prevHealth, setPrevHealth] = useState(playerHealth);

  useEffect(() => {
    if (playerHealth < prevHealth) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      setPrevHealth(playerHealth);
      return () => clearTimeout(t);
    }
    setPrevHealth(playerHealth);
  }, [playerHealth, prevHealth]);

  if (!flash) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-40"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,20,20,0.35) 100%)',
        animation: 'fadeOut 300ms ease-out forwards',
      }}
    >
      <style>{`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`}</style>
    </div>
  );
}

function Crosshair() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
      <svg viewBox="0 0 32 32" className="w-full h-full">
        <title>Aim crosshair</title>
        <line x1="16" y1="4" x2="16" y2="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1="16" y1="20" x2="16" y2="28" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1="4" y1="16" x2="12" y2="16" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1="20" y1="16" x2="28" y2="16" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <circle cx="16" cy="16" r="2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function KillFeed({ kills, deaths }: { kills: number; deaths: number }) {
  const [lastKills, setLastKills] = useState(0);
  const [lastDeaths, setLastDeaths] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (kills > lastKills) {
      setMessage('VICTORY — ENEMY DOWN');
      setLastKills(kills);
      const t = setTimeout(() => setMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [kills, lastKills]);

  useEffect(() => {
    if (deaths > lastDeaths) {
      setMessage('DEFEATED — YOU WENT DOWN');
      setLastDeaths(deaths);
      const t = setTimeout(() => setMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [deaths, lastDeaths]);

  if (!message) return null;

  return (
    <div
      className="absolute top-24 left-1/2 -translate-x-1/2 text-sm font-bold tracking-widest px-6 py-3 rounded-lg"
      style={{
        color: message.includes('VICTORY') ? '#4ade80' : '#ff4444',
        background: 'rgba(0,0,0,0.6)',
        border: `1px solid ${message.includes('VICTORY') ? 'rgba(74,222,128,0.3)' : 'rgba(255,68,68,0.3)'}`,
      }}
    >
      {message}
    </div>
  );
}

export function FlightHud() {
  const hud = useGameStore((s) => s.hud);
  const game = useGameStore((s) => s.game);
  const [showControls, setShowControls] = useState(true);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const dismissControls = useCallback(() => setShowControls(false), []);

  const handleEndFlight = useCallback(() => {
    game?.endSession();
  }, [game]);

  const setThrottle = useCallback(
    (up: boolean, down: boolean) => {
      game?.getInputManager().setUiThrottle(up, down);
    },
    [game],
  );

  const setBrake = useCallback(
    (active: boolean) => {
      game?.getInputManager().setUiBrake(active);
    },
    [game],
  );

  const setBoost = useCallback(
    (active: boolean) => {
      game?.getInputManager().setUiBoost(active);
    },
    [game],
  );

  const setFire = useCallback(
    (active: boolean) => {
      game?.getInputManager().setUiFire(active);
    },
    [game],
  );

  const speedKnots = Math.round(hud.speed * 1.944);
  const isDogfight = hud.mode === 'dogfight';

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: 'var(--font-mono)' }}>
      {showControls && <ControlsLegend onDismiss={dismissControls} />}

      <NeuroConnectBanner />

      {/* Top bar: speed, altitude, heading */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-start px-24 pt-8 pb-6"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,5,15,0.85) 0%, rgba(0,5,15,0.55) 60%, transparent 100%)',
        }}
      >
        <div
          className="flex rounded-lg"
          style={{ background: 'rgba(0,5,15,0.6)', backdropFilter: 'blur(6px)', padding: '14px 24px', gap: 36 }}
        >
          <div style={{ minWidth: 110 }}>
            <div className="text-xs tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              SPD
            </div>
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(hud.speed)}
              <span
                className="text-sm ml-1 font-normal"
                style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}
              >
                {speedKnots}kt
              </span>
            </div>
          </div>
          <div style={{ minWidth: 110 }}>
            <div className="text-xs tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              ALT
            </div>
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(hud.altitude)}
              <span className="text-sm ml-1 font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                ft
              </span>
            </div>
          </div>
          <div style={{ minWidth: 80 }}>
            <div className="text-xs tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              HDG
            </div>
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(hud.heading)}°
            </div>
          </div>
        </div>
        <div className="text-right pointer-events-auto flex flex-col items-end" style={{ gap: 14 }}>
          <div
            className="rounded-lg"
            style={{ background: 'rgba(0,5,15,0.6)', backdropFilter: 'blur(6px)', padding: '14px 24px' }}
          >
            <div className="text-xs tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              DOGFIGHT
            </div>
            <div
              className="text-xl font-semibold"
              style={{ color: 'var(--color-accent-gold)', fontFamily: 'var(--font-heading)' }}
            >
              {hud.aircraftId.toUpperCase().replace(/_/g, ' ')}
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowControls(true)}
              className="tracking-widest rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 font-bold"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-accent-gold)',
                background: 'rgba(0,10,20,0.7)',
                border: '1px solid rgba(255,200,100,0.4)',
                padding: '14px 20px',
                fontSize: 13,
              }}
            >
              HOW TO FLY
            </button>
            <button
              type="button"
              onClick={handleEndFlight}
              className="tracking-widest rounded-lg cursor-pointer transition-all hover:scale-105 hover:brightness-110 active:scale-95 font-bold"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#ffffff',
                background: 'rgba(180,40,30,0.9)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(180,40,30,0.4)',
                padding: '14px 32px',
                fontSize: 16,
              }}
            >
              END FLIGHT
            </button>
          </div>
        </div>
      </div>

      {/* Dogfight HUD */}
      {isDogfight && (
        <>
          <DamageFlash playerHealth={hud.playerHealth} />
          <Crosshair />
          <KillFeed kills={hud.kills} deaths={hud.deaths} />

          {/* Dogfight score / stats center */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center">
            <div className="text-xl font-bold" style={{ color: '#ff4444' }}>
              {hud.kills}{' '}
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                WINS
              </span>
              <span className="mx-2" style={{ color: 'var(--color-text-secondary)' }}>
                /
              </span>
              {hud.deaths}{' '}
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                LOSSES
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {formatTime(hud.elapsedMs)}
            </div>
          </div>

          {/* Health bars */}
          <div
            className="absolute flex flex-col rounded-lg"
            style={{
              left: 40,
              bottom: 200,
              gap: 10,
              padding: '16px 22px',
              background: 'rgba(0,5,15,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <HealthBar value={hud.playerHealth} max={100} label="YOU" color="var(--color-accent-cyan)" large />
            <HealthBar value={hud.aiHealth} max={100} label="ENEMY" color="#ff4444" large />
          </div>

          {/* Enemy direction compass */}
          {hud.enemyDir && <DirectionIndicator dir={hud.enemyDir} color="#ff4444" label="ENEMY" />}
        </>
      )}

      {/* Throttle bar + label (left side) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center rounded-lg"
        style={{ left: 40, gap: 6, padding: '12px 14px', background: 'rgba(0,5,15,0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div className="text-[10px] tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          THR
        </div>
        <div className="rounded-full relative" style={{ background: 'rgba(255,255,255,0.08)', width: 14, height: 160 }}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-100"
            style={{
              height: `${hud.throttle * 100}%`,
              background:
                hud.throttle > 0.8
                  ? 'var(--color-accent-gold)'
                  : hud.throttle < 0.2
                    ? '#ff6644'
                    : 'var(--color-accent-cyan)',
            }}
          />
        </div>
        <div className="text-xs font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
          {Math.round(hud.throttle * 100)}%
        </div>
      </div>

      {/* On-screen control buttons (bottom-right) */}
      <div className="absolute flex flex-col pointer-events-auto" style={{ right: 40, bottom: 200, gap: 10 }}>
        <button
          type="button"
          onPointerDown={() => setThrottle(true, false)}
          onPointerUp={() => setThrottle(false, false)}
          onPointerLeave={() => setThrottle(false, false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 72,
            height: 56,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(0,204,204,0.5)',
            color: 'var(--color-accent-cyan)',
            backdropFilter: 'blur(4px)',
          }}
        >
          THR ▲
        </button>
        <button
          type="button"
          onPointerDown={() => setThrottle(false, true)}
          onPointerUp={() => setThrottle(false, false)}
          onPointerLeave={() => setThrottle(false, false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 72,
            height: 56,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(0,204,204,0.4)',
            color: 'var(--color-accent-cyan)',
            backdropFilter: 'blur(4px)',
          }}
        >
          THR ▼
        </button>
        <button
          type="button"
          onPointerDown={() => setBoost(true)}
          onPointerUp={() => setBoost(false)}
          onPointerLeave={() => setBoost(false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 72,
            height: 56,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(255,200,100,0.5)',
            color: 'var(--color-accent-gold)',
            backdropFilter: 'blur(4px)',
          }}
        >
          BOOST
        </button>
        <button
          type="button"
          onPointerDown={() => setBrake(true)}
          onPointerUp={() => setBrake(false)}
          onPointerLeave={() => setBrake(false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 72,
            height: 56,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(255,80,60,0.5)',
            color: '#ff6644',
            backdropFilter: 'blur(4px)',
          }}
        >
          BRAKE
        </button>
        {isDogfight && (
          <button
            type="button"
            onPointerDown={() => setFire(true)}
            onPointerUp={() => setFire(false)}
            onPointerLeave={() => setFire(false)}
            className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
            style={{
              width: 72,
              height: 56,
              background: 'rgba(255,30,30,0.3)',
              border: '2px solid rgba(255,60,60,0.7)',
              color: '#ff4444',
              backdropFilter: 'blur(4px)',
            }}
          >
            FIRE
          </button>
        )}
      </div>

      {/* Dev controls hint */}
      <div
        className="absolute text-[10px] leading-relaxed"
        style={{ left: 40, bottom: 170, color: 'rgba(255,255,255,0.25)' }}
      >
        <div>] switch aircraft</div>
        <div>[ switch environment</div>
        <div>R restart{isDogfight ? ' · Space / Enter / Click to fire' : ''}</div>
      </div>

      {/* Bottom neuro cockpit panel */}
      <NeuroCockpit />
    </div>
  );
}
