import { type PointerEvent, useCallback, useEffect, useState } from 'react';
import { getModeMeta } from '@/game/modes.ts';
import type { GameMode } from '@/game/types.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { NeuroCockpit } from './NeuroCockpit.tsx';
import { NeuroConnectBanner } from './NeuroConnectBanner.tsx';

const HELP_DISMISSED_COUNT_KEY = 'neuroflight.help.dismissedCount';
const HELP_NEVER_SHOW_KEY = 'neuroflight.help.neverShow';

function shouldShowInitialHelp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(HELP_NEVER_SHOW_KEY) === 'true') return false;
  const count = Number.parseInt(window.localStorage.getItem(HELP_DISMISSED_COUNT_KEY) ?? '0', 10);
  return Number.isNaN(count) || count < 2;
}

function recordHelpDismissal(neverShow = false): void {
  if (typeof window === 'undefined') return;
  if (neverShow) window.localStorage.setItem(HELP_NEVER_SHOW_KEY, 'true');
  const count = Number.parseInt(window.localStorage.getItem(HELP_DISMISSED_COUNT_KEY) ?? '0', 10);
  window.localStorage.setItem(HELP_DISMISSED_COUNT_KEY, String((Number.isNaN(count) ? 0 : count) + 1));
}

function headingLabel(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((heading % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length];
}

function ControlsLegend({
  mode,
  onDismiss,
  onNeverShow,
}: {
  mode: GameMode;
  onDismiss: () => void;
  onNeverShow: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 15000);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
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
                <span style={{ color: '#ffb86b' }}>Space / Enter</span> - Tag
              </div>
              <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                <span style={{ color: 'var(--color-text-primary)' }}>Click</span> - Tag
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p
            className="text-[10px] tracking-widest transition-opacity"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.55 }}
          >
            CLICK OUTSIDE OR PRESS ESC
          </p>
          <button
            type="button"
            onClick={onNeverShow}
            className="pointer-events-auto rounded-md border px-3 py-2 text-[10px] font-bold tracking-widest"
            style={{
              borderColor: 'rgba(94,234,212,0.24)',
              color: '#a7f3d0',
              background: 'rgba(94,234,212,0.08)',
            }}
          >
            DON'T SHOW AGAIN
          </button>
        </div>
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
          <text x="50" y="53" textAnchor="middle" fill={`${color}80`} fontSize="7" fontFamily="var(--font-body)">
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
        width: '100%',
        background: 'rgba(5,14,18,0.62)',
        borderColor: `${accent}55`,
        backdropFilter: 'blur(8px)',
        padding: '14px 16px',
      }}
    >
      <div className="text-[10px] uppercase tracking-widest" style={{ color: accent, fontFamily: 'var(--font-body)' }}>
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

function InstrumentTile({
  label,
  value,
  unit,
  accent = 'var(--color-text-primary)',
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border"
      style={{
        minWidth: 118,
        padding: '12px 14px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.055))',
        borderColor: 'rgba(255,248,220,0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px rgba(0,0,0,0.16)',
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums" style={{ color: accent }}>
        {value}
        {unit && (
          <span className="ml-1 text-sm font-bold" style={{ color: 'rgba(255,246,220,0.62)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function ThrottleInstrument({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="rounded-xl border"
      style={{
        minWidth: 150,
        padding: '12px 14px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.055))',
        borderColor: 'rgba(255,248,220,0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 24px rgba(0,0,0,0.16)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
          Throttle
        </span>
        <span className="text-lg font-black tabular-nums" style={{ color: pct > 82 ? '#facc15' : '#5eead4' }}>
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.24)' }}>
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background:
              pct > 82 ? 'linear-gradient(90deg, #facc15, #ffb86b)' : 'linear-gradient(90deg, #5eead4, #38bdf8)',
          }}
        />
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
  const [showControls, setShowControls] = useState(() => shouldShowInitialHelp());

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const dismissControls = useCallback(() => {
    recordHelpDismissal(false);
    setShowControls(false);
  }, []);

  const neverShowControls = useCallback(() => {
    recordHelpDismissal(true);
    setShowControls(false);
  }, []);

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
  const headingText = headingLabel(hud.heading);

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: 'var(--font-body)' }}>
      {showControls && <ControlsLegend mode={hud.mode} onDismiss={dismissControls} onNeverShow={neverShowControls} />}

      {hud.nextObjectiveDir && <DirectionIndicator dir={hud.nextObjectiveDir} color={modeMeta.accent} label="ROUTE" />}

      {isDogfight && (
        <>
          <DamageFlash playerHealth={hud.playerHealth} />
          <Crosshair />
          <KillFeed kills={hud.kills} deaths={hud.deaths} />
          {hud.enemyDir && <DirectionIndicator dir={hud.enemyDir} color="#ff6b6b" label="RIVAL" />}
        </>
      )}

      <div
        className="absolute left-0 right-0 top-0 flex items-start justify-between px-5 pt-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,9,18,0.38), transparent)',
        }}
      >
        <div />
        {isDogfight && (
          <div
            className="text-center rounded-xl border px-5 py-2"
            style={{
              background: 'rgba(7,20,28,0.42)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="text-lg font-black tabular-nums" style={{ color: '#ffb86b' }}>
              {hud.kills}{' '}
              <span className="text-xs font-bold" style={{ color: 'rgba(255,246,220,0.58)' }}>
                WINS
              </span>
              <span className="mx-2" style={{ color: 'rgba(255,246,220,0.42)' }}>
                /
              </span>
              {hud.deaths}{' '}
              <span className="text-xs font-bold" style={{ color: 'rgba(255,246,220,0.58)' }}>
                LOSSES
              </span>
            </div>
            <div className="text-xs tabular-nums" style={{ color: 'rgba(255,246,220,0.48)' }}>
              {formatTime(hud.elapsedMs)}
            </div>
          </div>
        )}
        <div className="pointer-events-auto flex items-start gap-3">
          <div
            className="rounded-xl border px-5 py-3 text-right"
            style={{
              background: 'rgba(7,20,28,0.54)',
              borderColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              minWidth: 130,
            }}
          >
            <div className="text-[10px] tracking-[0.16em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
              {hud.scoreLabel}
            </div>
            <div className="text-2xl font-black tabular-nums" style={{ color: modeMeta.accent }}>
              {hud.score}
            </div>
          </div>
          <button
            type="button"
            onPointerDown={stopHudPointer}
            onClick={(e) => {
              e.stopPropagation();
              setShowControls(true);
            }}
            className="rounded-xl text-xs font-black tracking-widest"
            style={{
              color: 'var(--color-accent-gold)',
              background: 'linear-gradient(180deg, rgba(41,56,64,0.86), rgba(13,25,31,0.86))',
              border: '1px solid rgba(255,220,122,0.38)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 24px rgba(0,0,0,0.2)',
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
            className="rounded-xl text-xs font-black tracking-widest"
            style={{
              color: '#fff7e8',
              background: 'linear-gradient(180deg, rgba(236,92,76,0.95), rgba(173,48,38,0.95))',
              border: '1px solid rgba(255,198,178,0.28)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 12px 26px rgba(187,45,35,0.24)',
            }}
          >
            END
          </button>
        </div>
      </div>

      <div
        className="absolute left-4 right-4 bottom-4 pointer-events-auto"
        onPointerDown={stopHudPointer}
        style={{
          borderRadius: 24,
          padding: 14,
          background: 'linear-gradient(135deg, rgba(13,56,68,0.68), rgba(12,28,34,0.58) 48%, rgba(92,72,32,0.42))',
          border: '1px solid rgba(255,248,220,0.18)',
          backdropFilter: 'blur(18px) saturate(1.35)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -18px 40px rgba(0,0,0,0.12), 0 22px 70px rgba(0,0,0,0.28)',
        }}
      >
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: 'minmax(230px, 0.9fr) minmax(390px, 1.35fr) minmax(300px, 1fr) minmax(132px, 0.35fr)',
            gap: 12,
          }}
        >
          <MissionCard
            title={hud.missionTitle}
            subtitle={hud.missionSubtitle}
            objective={hud.objectiveText}
            subtext={hud.objectiveSubtext}
            progress={hud.objectiveProgress}
            goal={hud.objectiveGoal}
            accent={modeMeta.accent}
          />

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <InstrumentTile label="Speed" value={Math.round(hud.speed)} unit={`${speedKnots}kt`} />
              <InstrumentTile label="Altitude" value={Math.round(hud.altitude)} unit="ft" />
              <InstrumentTile label="Direction" value={headingText} accent={modeMeta.accent} />
              <ThrottleInstrument value={hud.throttle} />
            </div>
            <div
              className="rounded-xl border p-3"
              style={{
                background: 'rgba(255,255,255,0.07)',
                borderColor: 'rgba(255,248,220,0.13)',
              }}
            >
              <div className="mb-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,246,220,0.58)' }}>
                Adaptive signals
              </div>
              <div className="grid grid-cols-3 gap-3">
                <AdaptiveGauge label="Composure" value={hud.composure} color="#5eead4" />
                <AdaptiveGauge label="Load" value={hud.neuroLoad} color="#fb7185" />
                <AdaptiveGauge label="Flow" value={hud.flow} color="#facc15" />
              </div>
              <div className="mt-2 text-xs leading-4" style={{ color: 'rgba(255,246,220,0.68)' }}>
                {hud.neuroPrompt}
              </div>
            </div>
            {isDogfight && (
              <div
                className="rounded-xl border p-3"
                style={{ background: 'rgba(0,10,20,0.34)', borderColor: 'rgba(255,184,107,0.22)' }}
              >
                <HealthBar value={hud.playerHealth} max={100} label="YOU" color="var(--color-accent-cyan)" large />
                <div style={{ height: 8 }} />
                <HealthBar value={hud.aiHealth} max={100} label="RIVAL" color="#ff6b6b" large />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <NeuroConnectBanner variant="dock" />
            <NeuroCockpit embedded />
          </div>

          <div className="grid gap-2">
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
              className="rounded-xl text-xl font-black"
              style={{
                minHeight: 42,
                padding: 0,
                background: 'linear-gradient(180deg, rgba(30,67,68,0.94), rgba(17,39,45,0.94))',
                border: '1px solid rgba(94,234,212,0.42)',
                color: 'var(--color-accent-cyan)',
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
              className="rounded-xl text-xl font-black"
              style={{
                minHeight: 42,
                padding: 0,
                background: 'linear-gradient(180deg, rgba(30,67,68,0.94), rgba(17,39,45,0.94))',
                border: '1px solid rgba(94,234,212,0.36)',
                color: 'var(--color-accent-cyan)',
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
              className="rounded-xl text-xs font-black tracking-widest"
              style={{
                minHeight: 44,
                padding: 0,
                background: 'linear-gradient(180deg, rgba(83,68,28,0.96), rgba(38,35,23,0.96))',
                border: '1px solid rgba(250,204,21,0.48)',
                color: 'var(--color-accent-gold)',
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
              className="rounded-xl text-xs font-black tracking-widest"
              style={{
                minHeight: 44,
                padding: 0,
                background: 'linear-gradient(180deg, rgba(75,34,32,0.96), rgba(35,26,24,0.96))',
                border: '1px solid rgba(255,107,86,0.5)',
                color: '#ff745f',
              }}
            >
              BRAKE
            </button>
            {isDogfight && (
              <button
                type="button"
                aria-label="Tag rival"
                onPointerDown={(e) => {
                  stopHudPointer(e);
                  setFire(true);
                }}
                onPointerUp={(e) => {
                  stopHudPointer(e);
                  setFire(false);
                }}
                onPointerLeave={() => setFire(false)}
                className="rounded-xl text-xs font-black tracking-widest"
                style={{
                  minHeight: 46,
                  padding: 0,
                  background: 'linear-gradient(180deg, rgba(255,226,145,0.62), rgba(94,234,212,0.28))',
                  border: '2px solid rgba(255,224,144,0.76)',
                  color: '#fff2b8',
                }}
              >
                TAG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
