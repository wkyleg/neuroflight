import { type PointerEvent, useCallback, useEffect, useState } from 'react';
import { getModeMeta } from '@/game/modes.ts';
import type { GameMode } from '@/game/types.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { NeuroCockpit } from './NeuroCockpit.tsx';
import { NeuroConnectBanner } from './NeuroConnectBanner.tsx';

function ControlsLegend({ mode, onDismiss }: { mode: GameMode; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{
        background: 'radial-gradient(circle at 50% 46%, rgba(3,12,18,0.12), rgba(3,12,18,0.28))',
      }}
    >
      <button
        type="button"
        aria-label="Dismiss flight controls"
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
        style={{ background: 'transparent', border: 0, borderRadius: 0, minHeight: 0, padding: 0 }}
      />
      <div
        className="relative rounded-xl text-left"
        style={{
          background: 'rgba(0, 5, 15, 0.9)',
          border: '1px solid rgba(255, 200, 100, 0.28)',
          backdropFilter: 'blur(12px)',
          padding: '30px 34px',
          color: 'inherit',
          width: 'min(560px, calc(100vw - 40px))',
          boxShadow: '0 24px 80px rgba(0,0,0,0.34)',
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <h3
            className="text-sm font-bold tracking-widest"
            style={{ color: 'var(--color-accent-gold)', fontFamily: 'var(--font-heading)', marginBottom: 22 }}
          >
            HOW TO FLY
          </h3>
          <button
            type="button"
            onClick={onDismiss}
            className="pointer-events-auto rounded-md border px-2 py-1 text-[10px] font-bold tracking-widest"
            style={{
              borderColor: 'rgba(255,255,255,0.12)',
              color: 'rgba(240,236,224,0.74)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            CLOSE
          </button>
        </div>
        <div
          className="grid grid-cols-2 text-[12px]"
          style={{ color: 'var(--color-text-secondary)', gap: '12px 34px' }}
        >
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>W / ↑</span> - Pitch up
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>S / ↓</span> - Pitch down
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>A / ←</span> - Roll left
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>D / →</span> - Roll right
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>Q / E</span> - Yaw
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>Shift / Ctrl</span> - Throttle
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>B</span> - Brake
          </div>
          <div>
            <span style={{ color: 'var(--color-text-primary)' }}>R</span> - Restart
          </div>
          {mode === 'dogfight' && (
            <>
              <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                <span style={{ color: '#ff8888' }}>Space / Enter</span> - Fire
              </div>
              <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                <span style={{ color: 'var(--color-text-primary)' }}>Click</span> - Fire
              </div>
            </>
          )}
        </div>
        <p
          className="text-center text-[10px] tracking-widest transition-opacity"
          style={{ color: 'var(--color-text-secondary)', opacity: 0.5, marginTop: 22 }}
        >
          CLICK OUTSIDE TO DISMISS
        </p>
      </div>
    </div>
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
  const barW = large ? 170 : 140;
  const barH = large ? 12 : 10;
  const fontSize = large ? 12 : 11;
  return (
    <div className="flex items-center" style={{ gap: 12 }}>
      <span
        className="tracking-widest text-right font-bold"
        style={{
          color: 'var(--color-text-secondary)',
          width: large ? 54 : 64,
          fontFamily: 'var(--font-heading)',
          fontSize,
        }}
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

function AttitudeWidget({ heading, throttle, speed }: { heading: number; throttle: number; speed: number }) {
  const bank = ((heading % 60) - 30) * 0.45;
  const horizonOffset = Math.max(-16, Math.min(16, (throttle - 0.5) * 34));
  return (
    <div
      className="rounded-lg border"
      style={{
        width: 150,
        height: 118,
        background: 'rgba(4,12,16,0.62)',
        borderColor: 'rgba(255,244,202,0.18)',
        backdropFilter: 'blur(6px)',
        padding: 10,
      }}
    >
      <div
        className="relative h-full overflow-hidden rounded-md"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="absolute left-[-20%] top-[-25%] h-[150%] w-[140%]"
          style={{
            transform: `rotate(${bank}deg) translateY(${horizonOffset}px)`,
            background:
              'linear-gradient(180deg, rgba(56,189,248,0.42) 0%, rgba(125,211,252,0.24) 46%, rgba(255,244,202,0.82) 47%, rgba(181,119,48,0.46) 100%)',
          }}
        />
        <div className="absolute inset-x-5 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.72)' }} />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />
        <div
          className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold tabular-nums"
          style={{ color: '#fff8e2' }}
        >
          {Math.round(heading)} DEG / {Math.round(speed)}
        </div>
      </div>
    </div>
  );
}

function MissionCard({
  title,
  subtitle,
  objective,
  subtext,
  progress,
  goal,
  accent,
}: {
  title: string;
  subtitle: string;
  objective: string;
  subtext: string;
  progress: number;
  goal: number;
  accent: string;
}) {
  const pct = goal > 0 ? Math.max(0, Math.min(100, (progress / goal) * 100)) : 0;
  return (
    <div
      className="rounded-lg border"
      style={{
        width: 310,
        background: 'rgba(5,14,18,0.62)',
        borderColor: `${accent}55`,
        backdropFilter: 'blur(8px)',
        padding: '14px 16px',
      }}
    >
      <div className="text-[10px] uppercase tracking-widest" style={{ color: accent, fontFamily: 'var(--font-mono)' }}>
        {title}
      </div>
      <div className="mt-1 text-sm font-bold" style={{ color: '#fff8e2', fontFamily: 'var(--font-heading)' }}>
        {subtitle}
      </div>
      <div
        className="mt-3 text-base font-bold leading-6"
        style={{ color: '#ffffff', fontFamily: 'var(--font-heading)' }}
      >
        {objective}
      </div>
      <div className="mt-2 min-h-8 text-xs leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
        {subtext}
      </div>
      {goal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[9px]" style={{ color: 'rgba(240,236,224,0.52)' }}>
            <span>Progress</span>
            <span>
              {progress}/{goal}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdaptiveGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div style={{ minWidth: 0 }}>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
        {label}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-1 text-xs font-bold tabular-nums" style={{ color }}>
        {pct}%
      </div>
    </div>
  );
}

function KillFeed({ kills, deaths }: { kills: number; deaths: number }) {
  const [lastKills, setLastKills] = useState(0);
  const [lastDeaths, setLastDeaths] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (kills > lastKills) {
      setMessage('RIVAL TAGGED');
      setLastKills(kills);
      const t = setTimeout(() => setMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [kills, lastKills]);

  useEffect(() => {
    if (deaths > lastDeaths) {
      setMessage('RESET AND RALLY');
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
        color: message.includes('TAGGED') ? '#4ade80' : '#ffb86b',
        background: 'rgba(0,0,0,0.6)',
        border: `1px solid ${message.includes('TAGGED') ? 'rgba(74,222,128,0.3)' : 'rgba(255,184,107,0.3)'}`,
      }}
    >
      {message}
    </div>
  );
}

export function FlightHud() {
  const hud = useGameStore((s) => s.hud);
  const game = useGameStore((s) => s.game);
  const [showControls, setShowControls] = useState(false);

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

  const stopHudPointer = useCallback((e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const speedKnots = Math.round(hud.speed * 1.944);
  const isDogfight = hud.mode === 'dogfight';
  const modeMeta = getModeMeta(hud.mode);

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: 'var(--font-mono)' }}>
      {showControls && <ControlsLegend mode={hud.mode} onDismiss={dismissControls} />}

      <NeuroConnectBanner />

      {/* Top bar: speed, altitude, heading */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between items-start px-8 pt-4 pb-5"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,5,15,0.72) 0%, rgba(0,5,15,0.32) 58%, transparent 100%)',
        }}
      >
        <div
          className="flex rounded-lg"
          style={{ background: 'rgba(0,5,15,0.52)', backdropFilter: 'blur(6px)', padding: '10px 16px', gap: 24 }}
        >
          <div style={{ minWidth: 92 }}>
            <div className="text-[10px] tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              SPD
            </div>
            <div
              className="text-2xl font-bold tabular-nums"
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
          <div style={{ minWidth: 92 }}>
            <div className="text-[10px] tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              ALT
            </div>
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(hud.altitude)}
              <span className="text-sm ml-1 font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                ft
              </span>
            </div>
          </div>
          <div style={{ minWidth: 70 }}>
            <div className="text-[10px] tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              HDG
            </div>
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(hud.heading)}°
            </div>
          </div>
        </div>
        <div className="text-right pointer-events-auto flex flex-col items-end" style={{ gap: 14 }}>
          <div
            className="rounded-lg"
            style={{ background: 'rgba(0,5,15,0.52)', backdropFilter: 'blur(6px)', padding: '10px 18px' }}
          >
            <div className="text-[10px] tracking-widest font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {hud.scoreLabel}
            </div>
            <div
              className="text-xl font-semibold"
              style={{ color: modeMeta.accent, fontFamily: 'var(--font-heading)' }}
            >
              {hud.score}
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              type="button"
              onPointerDown={stopHudPointer}
              onClick={(e) => {
                e.stopPropagation();
                setShowControls(true);
              }}
              className="tracking-widest rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 font-bold"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-accent-gold)',
                background: 'rgba(0,10,20,0.7)',
                border: '1px solid rgba(255,200,100,0.4)',
                padding: '8px 13px',
                fontSize: 11,
              }}
            >
              HELP
            </button>
            <button
              type="button"
              onPointerDown={stopHudPointer}
              onClick={(e) => {
                e.stopPropagation();
                handleEndFlight();
              }}
              className="tracking-widest rounded-lg cursor-pointer transition-all hover:scale-105 hover:brightness-110 active:scale-95 font-bold"
              style={{
                fontFamily: 'var(--font-heading)',
                color: '#ffffff',
                background: 'rgba(180,40,30,0.9)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(180,40,30,0.4)',
                padding: '9px 18px',
                fontSize: 12,
              }}
            >
              END
            </button>
          </div>
        </div>
      </div>

      <div className="absolute left-8 top-28">
        <MissionCard
          title={hud.missionTitle}
          subtitle={hud.missionSubtitle}
          objective={hud.objectiveText}
          subtext={hud.objectiveSubtext}
          progress={hud.objectiveProgress}
          goal={hud.objectiveGoal}
          accent={modeMeta.accent}
        />
      </div>

      <div className="absolute right-8 top-28 flex flex-col items-end gap-2">
        <AttitudeWidget heading={hud.heading} throttle={hud.throttle} speed={hud.speed} />
        <div
          className="rounded-lg border"
          style={{
            background: 'rgba(5,14,18,0.58)',
            borderColor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(6px)',
            padding: '10px 12px',
            width: 226,
          }}
        >
          <div className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.56)' }}>
            Adaptive Signals
          </div>
          <div className="grid grid-cols-3 gap-2">
            <AdaptiveGauge label="Composure" value={hud.composure} color="#5eead4" />
            <AdaptiveGauge label="Load" value={hud.neuroLoad} color="#fb7185" />
            <AdaptiveGauge label="Flow" value={hud.flow} color="#facc15" />
          </div>
          <div className="mt-2 text-[10px] leading-4" style={{ color: 'rgba(240,236,224,0.58)' }}>
            {hud.neuroPrompt}
          </div>
        </div>
      </div>

      {hud.nextObjectiveDir && <DirectionIndicator dir={hud.nextObjectiveDir} color={modeMeta.accent} label="ROUTE" />}

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
              left: 32,
              bottom: 126,
              gap: 10,
              padding: '12px 16px',
              background: 'rgba(0,5,15,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <HealthBar value={hud.playerHealth} max={100} label="YOU" color="var(--color-accent-cyan)" large />
            <HealthBar value={hud.aiHealth} max={100} label="RIVAL" color="#ff4444" large />
          </div>

          {/* Rival direction compass */}
          {hud.enemyDir && <DirectionIndicator dir={hud.enemyDir} color="#ff4444" label="RIVAL" />}
        </>
      )}

      {/* Throttle bar + label (left side) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center rounded-lg"
        style={{ left: 28, gap: 5, padding: '9px 11px', background: 'rgba(0,5,15,0.42)', backdropFilter: 'blur(4px)' }}
      >
        <div className="text-[10px] tracking-widest font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          THR
        </div>
        <div className="rounded-full relative" style={{ background: 'rgba(255,255,255,0.08)', width: 12, height: 126 }}>
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
      <div className="absolute flex flex-col pointer-events-auto" style={{ right: 24, bottom: 108, gap: 6 }}>
        <button
          type="button"
          aria-label="Throttle up"
          onPointerDown={(e) => {
            stopHudPointer(e);
            setThrottle(true, false);
          }}
          onPointerUp={(e) => {
            stopHudPointer(e);
            setThrottle(false, false);
          }}
          onPointerLeave={() => setThrottle(false, false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 50,
            height: 38,
            minHeight: 38,
            padding: 0,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(0,204,204,0.5)',
            color: 'var(--color-accent-cyan)',
            backdropFilter: 'blur(4px)',
          }}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Throttle down"
          onPointerDown={(e) => {
            stopHudPointer(e);
            setThrottle(false, true);
          }}
          onPointerUp={(e) => {
            stopHudPointer(e);
            setThrottle(false, false);
          }}
          onPointerLeave={() => setThrottle(false, false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 50,
            height: 38,
            minHeight: 38,
            padding: 0,
            background: 'rgba(0,10,20,0.7)',
            border: '1px solid rgba(0,204,204,0.4)',
            color: 'var(--color-accent-cyan)',
            backdropFilter: 'blur(4px)',
          }}
        >
          ▼
        </button>
        <button
          type="button"
          aria-label="Boost"
          onPointerDown={(e) => {
            stopHudPointer(e);
            setBoost(true);
          }}
          onPointerUp={(e) => {
            stopHudPointer(e);
            setBoost(false);
          }}
          onPointerLeave={() => setBoost(false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 50,
            height: 38,
            minHeight: 38,
            padding: 0,
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
          aria-label="Brake"
          onPointerDown={(e) => {
            stopHudPointer(e);
            setBrake(true);
          }}
          onPointerUp={(e) => {
            stopHudPointer(e);
            setBrake(false);
          }}
          onPointerLeave={() => setBrake(false)}
          className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{
            width: 50,
            height: 38,
            minHeight: 38,
            padding: 0,
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
            aria-label="Fire"
            onPointerDown={(e) => {
              stopHudPointer(e);
              setFire(true);
            }}
            onPointerUp={(e) => {
              stopHudPointer(e);
              setFire(false);
            }}
            onPointerLeave={() => setFire(false)}
            className="rounded-lg text-xs font-bold tracking-wider flex items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
            style={{
              width: 50,
              height: 38,
              minHeight: 38,
              padding: 0,
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

      {/* Bottom neuro cockpit panel */}
      <NeuroCockpit />
    </div>
  );
}
