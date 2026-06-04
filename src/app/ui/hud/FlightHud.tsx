import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { getModeMeta } from '@/game/modes.ts';
import type { SessionPhase } from '@/game/session/sessionTypes.ts';
import type { GameMode } from '@/game/types.ts';
import type { FlightHudNotice } from '@/stores/gameStore.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { nextStableNumber, type StableNumberOptions } from './displayStabilizers.ts';
import { NeuroCockpit } from './NeuroCockpit.tsx';
import { NeuroConnectBanner } from './NeuroConnectBanner.tsx';
import { RecoveryOverlay } from './RecoveryOverlay.tsx';
import { SessionBriefingOverlay } from './SessionBriefingOverlay.tsx';
import { SessionPhaseBanner } from './SessionPhaseBanner.tsx';
import { phasePosition } from './sessionPhaseUi.ts';
import { TutorialOverlay } from './TutorialOverlay.tsx';

const HELP_DISMISSED_COUNT_KEY = 'neuroflight.help.dismissedCount';
const HELP_NEVER_SHOW_KEY = 'neuroflight.help.neverShow';
const MODE_HINT_COUNT_PREFIX = 'neuroflight.modeHint.';

const MODE_HINTS: Partial<Record<GameMode, { title: string; body: string }>> = {
  zen: {
    title: 'Zen Flight',
    body: 'Follow the glowing rings. If the next gate is offscreen, the route arrow points the way.',
  },
  free: {
    title: 'Expedition',
    body: 'Visit one story place at a time. Fly through the floating beacon beside each landmark.',
  },
};

const SPEED_DISPLAY_OPTIONS: StableNumberOptions = { maxStep: 7, smoothing: 0.28, deadband: 0.8 };
const ALTITUDE_DISPLAY_OPTIONS: StableNumberOptions = { maxStep: 38, smoothing: 0.24, deadband: 2 };
const THROTTLE_DISPLAY_OPTIONS: StableNumberOptions = { maxStep: 0.035, smoothing: 0.28, deadband: 0.006 };
const SCORE_DISPLAY_OPTIONS: StableNumberOptions = { maxStep: 140, smoothing: 0.42, deadband: 1 };

export function shouldShowInitialHelp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(HELP_NEVER_SHOW_KEY) === 'true') return false;
  const count = Number.parseInt(window.localStorage.getItem(HELP_DISMISSED_COUNT_KEY) ?? '0', 10);
  return Number.isNaN(count) || count < 2;
}

export function recordHelpDismissal(neverShow = false): void {
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

function useThrottledDisplayValue<T>(value: T, intervalMs: number): T {
  const latest = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    setDisplay(latest.current);
    const timer = window.setInterval(() => setDisplay(latest.current), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return display;
}

function useDwelledDisplayValue<T>(value: T, dwellMs: number, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const pendingRef = useRef<{ value: T; timer: number | null } | null>(null);

  useEffect(() => {
    if (isEqual(displayRef.current, value)) {
      if (pendingRef.current?.timer != null) window.clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
      return;
    }

    if (pendingRef.current?.timer != null) window.clearTimeout(pendingRef.current.timer);
    const timer = window.setTimeout(() => {
      displayRef.current = value;
      pendingRef.current = null;
      setDisplay(value);
    }, dwellMs);
    pendingRef.current = { value, timer };

    return () => window.clearTimeout(timer);
  }, [dwellMs, isEqual, value]);

  return display;
}

function useStableNumberDisplayValue(value: number, intervalMs: number, options: StableNumberOptions): number {
  const latest = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDisplay((current) => nextStableNumber(current, latest.current, options));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, options]);

  return display;
}

function useSmoothedDirectionValue(
  value: { x: number; y: number } | null,
  smoothing = 0.18,
): { x: number; y: number } | null {
  const latest = useRef(value);
  const displayRef = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const target = latest.current;
      const current = displayRef.current;
      if (!target) {
        if (current) {
          displayRef.current = null;
          setDisplay(null);
        }
      } else if (!current) {
        displayRef.current = target;
        setDisplay(target);
      } else {
        const next = {
          x: current.x + (target.x - current.x) * smoothing,
          y: current.y + (target.y - current.y) * smoothing,
        };
        const mag = Math.hypot(next.x, next.y);
        if (mag > 0.01) {
          next.x /= mag;
          next.y /= mag;
        }
        displayRef.current = next;
        setDisplay(next);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [smoothing]);

  return display;
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
        className="premium-glass-strong relative rounded-xl text-left"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 37, 47, 0.78), rgba(0, 5, 15, 0.72))',
          border: '1px solid rgba(255, 200, 100, 0.28)',
          backdropFilter: 'blur(28px) saturate(1.9)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
          padding: '30px 34px',
          color: 'inherit',
          width: 'min(560px, calc(100vw - 40px))',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -18px 42px rgba(0,0,0,0.16), 0 24px 80px rgba(0,0,0,0.34)',
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <h3
            className="text-sm font-bold tracking-widest"
            style={{ color: 'var(--color-accent-gold)', fontFamily: 'var(--font-instrument)', marginBottom: 22 }}
          >
            HOW TO FLY
          </h3>
          <button
            type="button"
            onClick={onDismiss}
            className="glass-button pointer-events-auto rounded-md border px-2 py-1 text-[10px] font-bold tracking-widest"
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
                <span style={{ color: '#ffb86b' }}>Space / Enter</span> - Fire
              </div>
              <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
                <span style={{ color: 'var(--color-text-primary)' }}>Click</span> - Fire
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
            className="glass-button pointer-events-auto rounded-md border px-3 py-2 text-[10px] font-bold tracking-widest"
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
          <text x="50" y="53" textAnchor="middle" fill={`${color}80`} fontSize="7" fontFamily="var(--font-instrument)">
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
  const barW = large ? 170 : 118;
  const barH = large ? 12 : 8;
  const fontSize = large ? 12 : 10;
  return (
    <div className="flex items-center" style={{ gap: large ? 12 : 8 }}>
      <span
        className="tracking-widest text-right font-bold"
        style={{
          color: 'var(--color-text-secondary)',
          width: large ? 54 : 52,
          fontFamily: 'var(--font-instrument)',
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
      <span className="font-bold tabular-nums" style={{ color, width: large ? 40 : 32, fontSize }}>
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

function ModeHint({ mode, onDone }: { mode: GameMode; onDone: () => void }) {
  const hint = MODE_HINTS[mode];

  useEffect(() => {
    const timer = window.setTimeout(onDone, 6200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  if (!hint) return null;

  return (
    <div
      className="premium-glass absolute left-1/2 top-24 z-30 w-[min(420px,calc(100vw-48px))] -translate-x-1/2 rounded-xl border px-5 py-4 text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(8,36,48,0.72), rgba(255,255,255,0.08))',
        borderColor: 'rgba(94,234,212,0.24)',
        backdropFilter: 'blur(24px) saturate(1.72)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.72)',
        boxShadow: '0 16px 44px rgba(0,0,0,0.24)',
      }}
    >
      <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-accent-cyan)' }}>
        {hint.title}
      </div>
      <div className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,248,226,0.82)' }}>
        {hint.body}
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
    <div className="flight-mission-card" style={{ width: '100%', borderColor: `${accent}55` }}>
      <div
        className="text-[10px] uppercase tracking-widest"
        style={{ color: accent, fontFamily: 'var(--font-instrument)' }}
      >
        {title}
      </div>
      <div className="waypoint-serif mt-0.5 text-xs font-bold leading-4" style={{ color: '#fff8e2' }}>
        {subtitle}
      </div>
      <div className="waypoint-serif mt-1 text-xs font-bold leading-4" style={{ color: '#ffffff' }}>
        {objective}
      </div>
      <div className="waypoint-serif mt-0.5 text-[10px] leading-3" style={{ color: 'rgba(240,236,224,0.68)' }}>
        {subtext}
      </div>
      {goal > 0 && (
        <div className="mt-2">
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
      <div className="text-[8px] uppercase tracking-widest" style={{ color: 'rgba(240,236,224,0.52)' }}>
        {label}
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-0.5 text-[10px] font-bold tabular-nums leading-none" style={{ color }}>
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
    <div className="flight-instrument-tile">
      <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-base font-black tabular-nums leading-none" style={{ color: accent }}>
        {value}
        {unit && (
          <span className="ml-1 text-[10px] font-bold" style={{ color: 'rgba(255,246,220,0.62)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function SessionPhaseChip({
  label,
  phase,
  remainingMs,
  elapsedMs,
  tutorial,
  accent,
}: {
  label: string;
  phase: SessionPhase;
  remainingMs: number;
  elapsedMs: number;
  tutorial: boolean;
  accent: string;
}) {
  const timeLabel = tutorial ? 'Practice' : `${Math.ceil(Math.max(0, remainingMs) / 1000)}s`;
  const totalMs = Math.max(1, elapsedMs + remainingMs);
  const pct = tutorial ? 1 : Math.max(0, Math.min(1, elapsedMs / totalMs));
  return (
    <div
      className="premium-glass flight-score-panel rounded-xl border"
      style={{
        minWidth: 154,
        background: 'linear-gradient(135deg, rgba(20,58,68,0.58), rgba(7,20,28,0.56))',
        borderColor: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(24px) saturate(1.75)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.75)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${accent} ${pct * 360}deg, rgba(255,255,255,0.12) 0deg)`,
          }}
        >
          <div className="h-7 w-7 rounded-full bg-black/45" />
        </div>
        <div className="min-w-0 text-left">
          <div className="truncate text-[9px] uppercase tracking-[0.12em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
            {phasePosition(phase)}
          </div>
          <div className="truncate text-sm font-black leading-tight" style={{ color: accent }}>
            {label}
          </div>
          <div className="text-[10px] tabular-nums" style={{ color: 'rgba(255,246,220,0.58)' }}>
            {timeLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThrottleInstrument({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flight-instrument-tile">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
          Throttle
        </span>
        <span
          className="text-sm font-black tabular-nums leading-none"
          style={{ color: pct > 82 ? '#facc15' : '#5eead4' }}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.22)' }}>
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

function TouchFlightStick({
  onAxes,
  onRelease,
}: {
  onAxes: (axes: { pitch: number; roll: number; yaw?: number }) => void;
  onRelease: () => void;
}) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  const updateAxes = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const maxRadius = rect.width * 0.38;
      const rawX = event.clientX - (rect.left + rect.width / 2);
      const rawY = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(rawX, rawY);
      const scale = distance > maxRadius ? maxRadius / distance : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      const roll = x / maxRadius;
      const pitch = -y / maxRadius;
      onAxes({ pitch, roll, yaw: roll * 0.45 });
      setKnob({ x, y, active: true });
    },
    [onAxes],
  );

  const release = useCallback(() => {
    activeRef.current = false;
    onAxes({ pitch: 0, roll: 0, yaw: 0 });
    setKnob({ x: 0, y: 0, active: false });
    onRelease();
  }, [onAxes, onRelease]);

  return (
    <div
      ref={padRef}
      className="mobile-flight-stick premium-glass-strong"
      aria-label="Touch flight stick"
      role="application"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        activeRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateAxes(event);
      }}
      onPointerMove={(event) => {
        if (!activeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        updateAxes(event);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        event.stopPropagation();
        release();
      }}
      onPointerCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        release();
      }}
      style={{
        background:
          'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.22), transparent 34%), linear-gradient(145deg, rgba(12,56,70,0.58), rgba(7,20,29,0.72))',
        border: '1px solid rgba(255,248,220,0.26)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.26), 0 18px 48px rgba(0,0,0,0.28)',
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 h-[38%] w-[38%] rounded-full"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          background: knob.active
            ? 'radial-gradient(circle, rgba(255,246,220,0.88), rgba(94,234,212,0.5))'
            : 'radial-gradient(circle, rgba(255,246,220,0.55), rgba(94,234,212,0.22))',
          border: '1px solid rgba(255,248,220,0.35)',
          boxShadow: '0 0 26px rgba(94,234,212,0.26)',
          transition: knob.active ? 'none' : 'transform 160ms ease',
        }}
      />
    </div>
  );
}

const NOTICE_TONE_STYLES: Record<FlightHudNotice['tone'], { color: string; border: string; glow: string }> = {
  hit: { color: '#ffbc73', border: 'rgba(255,184,107,0.42)', glow: 'rgba(255,184,107,0.22)' },
  win: { color: '#7cff9a', border: 'rgba(124,255,154,0.42)', glow: 'rgba(94,234,212,0.22)' },
  bonus: { color: '#c4b5fd', border: 'rgba(196,181,253,0.46)', glow: 'rgba(168,85,247,0.26)' },
  reset: { color: '#ffd36a', border: 'rgba(255,211,106,0.44)', glow: 'rgba(251,113,133,0.18)' },
};

function FlightEventNotice({ notice }: { notice: FlightHudNotice | null }) {
  const [displayNotice, setDisplayNotice] = useState<FlightHudNotice | null>(null);
  const noticeRef = useRef<FlightHudNotice | null>(null);
  const noticeId = notice?.id ?? null;

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    if (noticeId === null) {
      setDisplayNotice(null);
      return;
    }
    const activeNotice = noticeRef.current;
    if (!activeNotice) {
      setDisplayNotice(null);
      return;
    }
    setDisplayNotice(activeNotice);
    const timer = window.setTimeout(() => setDisplayNotice(null), activeNotice.durationMs);
    return () => window.clearTimeout(timer);
  }, [noticeId]);

  if (!displayNotice) return null;

  const style = NOTICE_TONE_STYLES[displayNotice.tone];

  return (
    <div
      className={`premium-glass-strong flight-event-toast flight-event-toast-${displayNotice.tone} text-xs font-black tracking-widest`}
      style={{
        color: style.color,
        background:
          'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.2), transparent 44%), linear-gradient(180deg, rgba(30,24,13,0.82), rgba(6,18,20,0.7))',
        border: `1px solid ${style.border}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 14px 34px rgba(0,0,0,0.28), 0 0 26px ${style.glow}`,
        backdropFilter: 'blur(24px) saturate(1.9)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.9)',
      }}
    >
      {displayNotice.text}
    </div>
  );
}

export function FlightHud() {
  const hud = useGameStore((s) => s.hud);
  const game = useGameStore((s) => s.game);
  const [showControls, setShowControls] = useState(() => shouldShowInitialHelp());
  const [soundEnabled, setSoundEnabled] = useState(() => game?.isSoundEnabled() ?? true);
  const [showModeHint, setShowModeHint] = useState(false);
  const endingRef = useRef(false);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const reactivateControls = useCallback(() => {
    window.requestAnimationFrame(() => game?.activateControls());
  }, [game]);

  const dismissControls = useCallback(() => {
    recordHelpDismissal(false);
    setShowControls(false);
    reactivateControls();
  }, [reactivateControls]);

  const neverShowControls = useCallback(() => {
    recordHelpDismissal(true);
    setShowControls(false);
    reactivateControls();
  }, [reactivateControls]);

  const handleEndFlight = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    game?.endSession();
  }, [game]);

  const hideModeHint = useCallback(() => {
    setShowModeHint(false);
  }, []);

  useEffect(() => {
    const hint = MODE_HINTS[hud.mode];
    if (!hint || typeof window === 'undefined') {
      setShowModeHint(false);
      return;
    }
    const key = `${MODE_HINT_COUNT_PREFIX}${hud.mode}`;
    const count = Number.parseInt(window.localStorage.getItem(key) ?? '0', 10);
    if (!Number.isNaN(count) && count >= 2) {
      setShowModeHint(false);
      return;
    }
    window.localStorage.setItem(key, String((Number.isNaN(count) ? 0 : count) + 1));
    setShowModeHint(true);
  }, [hud.mode]);

  useEffect(() => {
    setSoundEnabled(game?.isSoundEnabled() ?? true);
    endingRef.current = false;
  }, [game]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(game?.toggleSound() ?? false);
    reactivateControls();
  }, [game, reactivateControls]);

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

  const setTouchAxes = useCallback(
    (axes: { pitch: number; roll: number; yaw?: number }) => {
      game?.getInputManager().setTouchAxes(axes);
    },
    [game],
  );

  const stopHudPointer = useCallback((e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
  }, []);

  const stopMomentaryPointer = useCallback((e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const displaySpeed = useStableNumberDisplayValue(hud.speed, 150, SPEED_DISPLAY_OPTIONS);
  const displayAltitude = useStableNumberDisplayValue(hud.altitude, 140, ALTITUDE_DISPLAY_OPTIONS);
  const displayThrottle = useStableNumberDisplayValue(hud.throttle, 150, THROTTLE_DISPLAY_OPTIONS);
  const displayHeading = useThrottledDisplayValue(hud.heading, 360);
  const displayComposure = useThrottledDisplayValue(hud.composure, 1000);
  const displayLoad = useThrottledDisplayValue(hud.neuroLoad, 1000);
  const displayFlow = useThrottledDisplayValue(hud.flow, 1000);
  const displayPrompt = useThrottledDisplayValue(hud.neuroPrompt, 1000);
  const displayScore = useStableNumberDisplayValue(hud.score, 80, SCORE_DISPLAY_OPTIONS);
  const displayKills = useThrottledDisplayValue(hud.kills, 260);
  const displayDeaths = useThrottledDisplayValue(hud.deaths, 260);
  const displayElapsedMs = useThrottledDisplayValue(hud.elapsedMs, 1000);
  const displayMissionSubtitle = useDwelledDisplayValue(hud.missionSubtitle, 800);
  const displayObjectiveText = useDwelledDisplayValue(hud.objectiveText, 850);
  const displayObjectiveSubtext = useDwelledDisplayValue(hud.objectiveSubtext, 1050);
  const displayObjectiveProgress = useDwelledDisplayValue(Math.max(0, Math.round(hud.objectiveProgress)), 520);
  const displayObjectiveGoal = useDwelledDisplayValue(Math.max(0, Math.round(hud.objectiveGoal)), 520);
  const displayNextRingDir = useSmoothedDirectionValue(hud.nextRingDir);
  const displayNextObjectiveDir = useSmoothedDirectionValue(hud.nextObjectiveDir);
  const displayEnemyDir = useSmoothedDirectionValue(hud.enemyDir);
  const speedKnots = Math.round(displaySpeed * 1.944);
  const isDogfight = hud.mode === 'dogfight';
  const modeMeta = getModeMeta(hud.mode);
  const headingText = headingLabel(displayHeading);

  return (
    <div
      className="neuroflight-hud absolute inset-0 pointer-events-none select-none"
      style={{ fontFamily: 'var(--font-instrument)' }}
    >
      <SessionPhaseBanner />
      <SessionBriefingOverlay />
      <RecoveryOverlay />
      <TutorialOverlay />
      {showControls && <ControlsLegend mode={hud.mode} onDismiss={dismissControls} onNeverShow={neverShowControls} />}
      {showModeHint && !showControls && <ModeHint mode={hud.mode} onDone={hideModeHint} />}

      {displayNextRingDir && <DirectionIndicator dir={displayNextRingDir} color={modeMeta.accent} label="ROUTE" />}
      {displayNextObjectiveDir && (
        <DirectionIndicator dir={displayNextObjectiveDir} color={modeMeta.accent} label="ROUTE" />
      )}

      {isDogfight && (
        <>
          <DamageFlash playerHealth={hud.playerHealth} />
          <Crosshair />
          <FlightEventNotice notice={hud.bonusNotice} />
          {displayEnemyDir && <DirectionIndicator dir={displayEnemyDir} color="#ff6b6b" label="RIVAL" />}
        </>
      )}

      <div
        className="flight-top-strip absolute left-0 right-0 top-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,9,18,0.38), transparent)',
        }}
      >
        {isDogfight && (
          <div
            className="premium-glass flight-dogfight-counter text-center rounded-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(16,48,58,0.58), rgba(7,20,28,0.46))',
              borderColor: 'rgba(255,255,255,0.16)',
              backdropFilter: 'blur(24px) saturate(1.75)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.75)',
            }}
          >
            <div className="text-lg font-black tabular-nums" style={{ color: '#ffb86b' }}>
              {displayKills}{' '}
              <span className="text-xs font-bold" style={{ color: 'rgba(255,246,220,0.58)' }}>
                WINS
              </span>
              <span className="mx-2" style={{ color: 'rgba(255,246,220,0.42)' }}>
                /
              </span>
              {displayDeaths}{' '}
              <span className="text-xs font-bold" style={{ color: 'rgba(255,246,220,0.58)' }}>
                LOSSES
              </span>
            </div>
            <div className="text-xs tabular-nums" style={{ color: 'rgba(255,246,220,0.48)' }}>
              {formatTime(displayElapsedMs)}
            </div>
          </div>
        )}
        <div className="flight-top-actions pointer-events-auto flex items-start gap-2">
          <div
            className="premium-glass flight-score-panel rounded-xl border text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(20,58,68,0.58), rgba(7,20,28,0.56))',
              borderColor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(24px) saturate(1.75)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.75)',
            }}
          >
            <div className="text-[9px] tracking-[0.12em]" style={{ color: 'rgba(255,246,220,0.62)' }}>
              {hud.scoreLabel}
            </div>
            <div className="text-xl font-black tabular-nums leading-none" style={{ color: modeMeta.accent }}>
              {Math.round(displayScore)}
            </div>
          </div>
          <SessionPhaseChip
            label={hud.sessionPhaseLabel}
            phase={hud.sessionPhase}
            remainingMs={hud.sessionPhaseRemainingMs}
            elapsedMs={hud.sessionPhaseElapsedMs}
            tutorial={hud.tutorial}
            accent={modeMeta.accent}
          />
          <button
            type="button"
            onPointerDown={stopHudPointer}
            onClick={(e) => {
              e.stopPropagation();
              setShowControls(true);
            }}
            className="glass-button rounded-xl text-xs font-black tracking-widest"
            style={{
              color: 'var(--color-accent-gold)',
              background: 'linear-gradient(180deg, rgba(68,84,92,0.72), rgba(13,25,31,0.7))',
              border: '1px solid rgba(255,220,122,0.38)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 24px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(22px) saturate(1.65)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.65)',
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
            className="glass-button rounded-xl text-xs font-black tracking-widest"
            style={{
              color: '#fff7e8',
              background: 'linear-gradient(180deg, rgba(236,92,76,0.86), rgba(173,48,38,0.82))',
              border: '1px solid rgba(255,198,178,0.28)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 12px 26px rgba(187,45,35,0.24)',
              backdropFilter: 'blur(22px) saturate(1.65)',
              WebkitBackdropFilter: 'blur(22px) saturate(1.65)',
            }}
          >
            DEBRIEF
          </button>
        </div>
      </div>

      <TouchFlightStick onAxes={setTouchAxes} onRelease={reactivateControls} />

      <div className="flight-control-rail flight-controls-stack pointer-events-auto" onPointerDown={stopHudPointer}>
        <button
          type="button"
          aria-label="Toggle sound"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSound();
          }}
          className="glass-button flight-control-button text-xs font-black tracking-widest"
          style={{
            background: soundEnabled
              ? 'linear-gradient(180deg, rgba(57,73,94,0.94), rgba(22,38,54,0.94))'
              : 'linear-gradient(180deg, rgba(45,50,55,0.8), rgba(22,24,27,0.8))',
            border: soundEnabled ? '1px solid rgba(102,183,255,0.5)' : '1px solid rgba(255,255,255,0.16)',
            color: soundEnabled ? '#9bd8ff' : 'rgba(255,246,220,0.5)',
          }}
        >
          {soundEnabled ? 'SOUND ON' : 'SOUND OFF'}
        </button>
        <button
          type="button"
          aria-label="Throttle up"
          onPointerDown={(e) => {
            stopMomentaryPointer(e);
            setThrottle(true, false);
          }}
          onPointerUp={(e) => {
            stopMomentaryPointer(e);
            setThrottle(false, false);
            reactivateControls();
          }}
          onPointerLeave={() => {
            setThrottle(false, false);
            reactivateControls();
          }}
          className="glass-button flight-control-button text-xl font-black"
          style={{
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
            stopMomentaryPointer(e);
            setThrottle(false, true);
          }}
          onPointerUp={(e) => {
            stopMomentaryPointer(e);
            setThrottle(false, false);
            reactivateControls();
          }}
          onPointerLeave={() => {
            setThrottle(false, false);
            reactivateControls();
          }}
          className="glass-button flight-control-button text-xl font-black"
          style={{
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
            stopMomentaryPointer(e);
            setBoost(true);
          }}
          onPointerUp={(e) => {
            stopMomentaryPointer(e);
            setBoost(false);
            reactivateControls();
          }}
          onPointerLeave={() => {
            setBoost(false);
            reactivateControls();
          }}
          className="glass-button flight-control-button text-xs font-black tracking-widest"
          style={{
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
            stopMomentaryPointer(e);
            setBrake(true);
          }}
          onPointerUp={(e) => {
            stopMomentaryPointer(e);
            setBrake(false);
            reactivateControls();
          }}
          onPointerLeave={() => {
            setBrake(false);
            reactivateControls();
          }}
          className="glass-button flight-control-button text-xs font-black tracking-widest"
          style={{
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
            aria-label="Fire"
            onPointerDown={(e) => {
              stopMomentaryPointer(e);
              setFire(true);
            }}
            onPointerUp={(e) => {
              stopMomentaryPointer(e);
              setFire(false);
              reactivateControls();
            }}
            onPointerLeave={() => {
              setFire(false);
              reactivateControls();
            }}
            className="glass-button flight-control-button text-xs font-black tracking-widest"
            style={{
              background: 'linear-gradient(180deg, rgba(255,226,145,0.62), rgba(94,234,212,0.28))',
              border: '2px solid rgba(255,224,144,0.76)',
              color: '#fff2b8',
            }}
          >
            FIRE
          </button>
        )}
      </div>

      <div
        className="premium-glass-strong flight-cockpit-shell pointer-events-auto"
        onPointerDown={stopHudPointer}
        style={{
          background: 'linear-gradient(135deg, rgba(19,82,100,0.6), rgba(10,28,36,0.64) 45%, rgba(129,94,40,0.34))',
          border: '1px solid rgba(255,248,220,0.3)',
          backdropFilter: 'blur(30px) saturate(1.95) brightness(1.05)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.95) brightness(1.05)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -20px 48px rgba(0,0,0,0.16), 0 24px 78px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flight-cockpit-grid">
          <div className="flight-zone-mission min-w-0">
            <MissionCard
              title={hud.missionTitle}
              subtitle={displayMissionSubtitle}
              objective={displayObjectiveText}
              subtext={displayObjectiveSubtext}
              progress={displayObjectiveProgress}
              goal={displayObjectiveGoal}
              accent={modeMeta.accent}
            />
          </div>

          <div className="flight-zone-instruments flex min-w-0 flex-col gap-2">
            <div className="flight-instrument-grid">
              <InstrumentTile label="Speed" value={Math.round(displaySpeed)} unit={`${speedKnots}kt`} />
              <InstrumentTile label="Altitude" value={Math.round(displayAltitude)} unit="ft" />
              <InstrumentTile label="Direction" value={headingText} accent={modeMeta.accent} />
              <ThrottleInstrument value={displayThrottle} />
            </div>
            <div className="flight-cockpit-section flight-adaptive-panel">
              <div
                className="mb-1.5 text-[9px] uppercase tracking-[0.16em]"
                style={{ color: 'rgba(255,246,220,0.58)' }}
              >
                Adaptive signals
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AdaptiveGauge label="Composure" value={displayComposure} color="#5eead4" />
                <AdaptiveGauge label="Load" value={displayLoad} color="#fb7185" />
                <AdaptiveGauge label="Flow" value={displayFlow} color="#facc15" />
              </div>
              <div className="mt-1 text-[11px] leading-3" style={{ color: 'rgba(255,246,220,0.68)' }}>
                {displayPrompt}
              </div>
            </div>
            {isDogfight && (
              <div className="flight-cockpit-section flight-health-strip">
                <HealthBar value={hud.playerHealth} max={100} label="YOU" color="var(--color-accent-cyan)" />
                <HealthBar value={hud.aiHealth} max={100} label="RIVAL" color="#ff6b6b" />
              </div>
            )}
          </div>

          <div className="flight-zone-bio flex min-w-0 flex-col gap-2">
            <NeuroConnectBanner variant="dock" />
            <NeuroCockpit embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
