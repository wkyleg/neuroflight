import { useEffect, useMemo, useRef, useState } from 'react';
import { useNeuroConnection, useNeuroSignals } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';

export type BiofeedbackDisplayStateKind = 'none' | 'permission-denied' | 'warming' | 'low-confidence' | 'ready';

export type BiofeedbackDisplayTone = 'neutral' | 'warming' | 'ready' | 'warning';

export interface BiofeedbackDisplayInput {
  source: string;
  cameraActive: boolean;
  eegConnected: boolean;
  mockEnabled: boolean;
  signalQuality: number;
  bpmQuality: number;
  cameraError?: string | null;
}

export interface BiofeedbackDisplayState {
  state: BiofeedbackDisplayStateKind;
  primaryLabel: string;
  guidance: string;
  detail: string;
  tone: BiofeedbackDisplayTone;
  showCameraMetrics: boolean;
  showEegAdvanced: boolean;
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function isPermissionError(error?: string | null): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes('permission') || normalized.includes('denied') || normalized.includes('blocked');
}

export function getBiofeedbackDisplayState(input: BiofeedbackDisplayInput): BiofeedbackDisplayState {
  const signalQuality = Math.max(0, Math.min(1, input.signalQuality));
  const bpmQuality = Math.max(0, Math.min(1, input.bpmQuality));

  if (!input.cameraActive && isPermissionError(input.cameraError)) {
    return {
      state: 'permission-denied',
      primaryLabel: 'CAMERA BLOCKED',
      guidance: 'Camera blocked in browser settings',
      detail: 'You can still fly; the debrief will focus on flight events.',
      tone: 'warning',
      showCameraMetrics: false,
      showEegAdvanced: false,
    };
  }

  if (input.cameraActive || input.source === 'rppg') {
    if (signalQuality >= 0.72 || bpmQuality >= 0.72) {
      return {
        state: 'ready',
        primaryLabel: 'CAMERA',
        guidance: 'Signal ready',
        detail: 'Camera signal quality is ready for debrief insights.',
        tone: 'ready',
        showCameraMetrics: true,
        showEegAdvanced: false,
      };
    }
    if (signalQuality >= 0.28 || bpmQuality >= 0.28) {
      return {
        state: 'warming',
        primaryLabel: 'CAMERA',
        guidance: 'Camera warming',
        detail: 'Center your face and hold steady while the signal settles.',
        tone: 'warming',
        showCameraMetrics: true,
        showEegAdvanced: false,
      };
    }
    return {
      state: 'low-confidence',
      primaryLabel: 'CAMERA',
      guidance: 'More light',
      detail: 'Weak-signal moments stay out of camera insights.',
      tone: 'warning',
      showCameraMetrics: true,
      showEegAdvanced: false,
    };
  }

  return {
    state: 'none',
    primaryLabel: 'OPTIONAL',
    guidance: 'Behavior-only ready',
    detail: 'Fly normally; camera can add debrief notes later.',
    tone: 'neutral',
    showCameraMetrics: false,
    showEegAdvanced: false,
  };
}

function toneColor(tone: BiofeedbackDisplayTone, value: number): string {
  switch (tone) {
    case 'ready':
      return '#42e9a8';
    case 'warming':
      return '#facc15';
    case 'warning':
      return '#fb7185';
    default:
      if (value >= 0.72) return '#42e9a8';
      if (value >= 0.38) return '#facc15';
      return 'rgba(240,236,224,0.72)';
  }
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

function MetricChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="neuro-metric-chip"
      style={{
        minWidth: 54,
      }}
    >
      <div className="text-[8px] uppercase tracking-wide" style={{ color: 'rgba(240,236,224,0.55)' }}>
        {label}
      </div>
      <div
        className="text-xs font-bold tabular-nums leading-tight"
        style={{ color: tone ?? 'var(--color-text-primary)' }}
      >
        {value}
      </div>
    </div>
  );
}

function SignalBars({ value }: { value: number }) {
  const bars = Math.round(Math.max(0, Math.min(1, value)) * 5);
  return (
    <div className="flex items-end" style={{ gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 5,
            height: 7 + i * 3,
            background: i < bars ? toneColor('neutral', value) : 'rgba(255,255,255,0.14)',
            transition: 'height 180ms ease, background 220ms ease',
          }}
        />
      ))}
    </div>
  );
}

function CameraPreview({ active, compact = false }: { active: boolean; compact?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const manager = useNeuroStore.getState().manager;
    const video = manager?.getCameraVideoElement();
    const host = hostRef.current;
    if (!video || !host) return;

    const previousParent = video.parentElement;
    const previousNext = video.nextSibling;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = 'scaleX(-1)';
    host.appendChild(video);

    return () => {
      if (previousParent) {
        previousParent.insertBefore(video, previousNext);
      } else if (video.parentElement === host) {
        video.remove();
      }
    };
  }, [active]);

  return (
    <div
      ref={hostRef}
      className="neuro-camera-preview overflow-hidden"
      style={{
        width: compact ? 52 : 76,
        height: compact ? 34 : 46,
        borderColor: active ? 'rgba(94,234,212,0.36)' : 'rgba(255,255,255,0.1)',
      }}
    >
      {!active && (
        <div className="flex h-full items-center justify-center text-[9px]" style={{ color: 'rgba(240,236,224,0.55)' }}>
          CAMERA
        </div>
      )}
    </div>
  );
}

function signalHintForState(state: BiofeedbackDisplayState, signalQuality: number): string {
  if (state.state === 'permission-denied') return 'Check browser camera access';
  if (state.state === 'low-confidence') return 'More light or a steadier face';
  if (state.state === 'warming')
    return signalQuality < 0.45 ? 'Center face in the camera' : 'Hold steady while signal settles';
  if (state.state === 'ready') return 'Camera signal is tracking';
  return 'Fly normally; camera optional';
}

interface NeuroCockpitProps {
  embedded?: boolean;
}

export function NeuroCockpit({ embedded = false }: NeuroCockpitProps = {}) {
  const neuro = useNeuroSignals();
  const connection = useNeuroConnection();
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const displaySignalQuality = useThrottledDisplayValue(neuro.signalQuality, 1000);
  const displayBpm = useThrottledDisplayValue(neuro.bpm, 1000);
  const displayBpmQuality = useThrottledDisplayValue(neuro.bpmQuality, 1000);
  const displayHrv = useThrottledDisplayValue(neuro.hrvRmssd, 1000);
  const displayResp = useThrottledDisplayValue(neuro.respirationRate, 1000);

  const rawDisplayState = useMemo(
    () =>
      getBiofeedbackDisplayState({
        source: neuro.source,
        cameraActive: connection.cameraActive,
        eegConnected: connection.eegConnected,
        mockEnabled: connection.mockEnabled,
        signalQuality: displaySignalQuality,
        bpmQuality: displayBpmQuality,
        cameraError: connection.error.camera,
      }),
    [
      neuro.source,
      connection.cameraActive,
      connection.eegConnected,
      connection.mockEnabled,
      connection.error.camera,
      displaySignalQuality,
      displayBpmQuality,
    ],
  );
  const displayState = useThrottledDisplayValue(rawDisplayState, 900);

  const tone = toneColor(displayState.tone, displaySignalQuality);
  const activePreview = connection.cameraActive && !connection.error.camera;
  const previewExpanded = previewOpen && activePreview;
  const signalHint = signalHintForState(displayState, displaySignalQuality);
  const bpm = displayBpm !== null ? Math.round(displayBpm).toString() : '--';
  const hrv = displayHrv !== null ? `${Math.round(displayHrv)}ms` : '--';
  const resp = displayResp !== null ? displayResp.toFixed(1) : '--';
  const delta =
    neuro.baselineDelta !== null ? `${neuro.baselineDelta > 0 ? '+' : ''}${Math.round(neuro.baselineDelta)}` : '--';
  const showAdvanced = expanded;

  return (
    <div
      className={
        embedded
          ? 'neuro-cockpit neuro-cockpit-embedded pointer-events-auto'
          : 'neuro-cockpit absolute left-6 bottom-6 pointer-events-auto'
      }
      style={{
        width: embedded ? '100%' : showAdvanced ? 430 : 342,
        fontFamily: 'var(--font-instrument)',
      }}
    >
      <div
        className={`neuro-cockpit-panel ${
          embedded ? 'neuro-cockpit-panel-flat' : 'premium-glass rounded-lg border shadow-lg'
        }`}
        style={{
          background: embedded
            ? undefined
            : 'linear-gradient(135deg, rgba(7,30,38,0.74), rgba(255,255,255,0.07), rgba(18,26,26,0.58))',
          borderColor: embedded ? undefined : 'rgba(94,234,212,0.22)',
          backdropFilter: embedded ? undefined : 'blur(24px) saturate(1.7)',
          WebkitBackdropFilter: embedded ? undefined : 'blur(24px) saturate(1.7)',
          boxShadow: embedded
            ? undefined
            : 'inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -14px 34px rgba(0,0,0,0.12), 0 14px 34px rgba(0,0,0,0.26)',
          padding: embedded ? 0 : 13,
        }}
      >
        <div className="flex items-center justify-between" style={{ gap: embedded ? 8 : 10 }}>
          <div className="flex items-center" style={{ gap: embedded ? 8 : 10 }}>
            <CameraPreview active={activePreview} compact={embedded && !previewExpanded} />
            <div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(240,236,224,0.58)' }}>
                Camera biofeedback
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span className="text-sm font-bold" style={{ color: tone, fontFamily: 'var(--font-instrument)' }}>
                  {displayState.primaryLabel}
                </span>
                <SignalBars value={displaySignalQuality} />
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(240,236,224,0.72)' }}>
                {displayState.guidance}
              </div>
              <div className="text-[10px]" style={{ color: 'rgba(240,236,224,0.52)' }}>
                {embedded ? signalHint : displayState.detail}
              </div>
              {!embedded && (
                <div className="text-[10px]" style={{ color: 'rgba(240,236,224,0.52)' }}>
                  {signalHint}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="neuro-cockpit-action rounded-md border text-[10px] font-bold"
              style={{
                borderColor: previewOpen ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.14)',
                color: previewOpen ? '#5eead4' : 'rgba(240,236,224,0.72)',
              }}
            >
              {previewOpen ? 'MIN' : 'CAM'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="neuro-cockpit-action rounded-md border text-[10px] font-bold"
              style={{
                borderColor: showAdvanced ? 'rgba(250,204,21,0.52)' : 'rgba(255,255,255,0.14)',
                color: showAdvanced ? '#facc15' : 'rgba(240,236,224,0.72)',
              }}
            >
              {showAdvanced ? 'LESS' : 'MORE'}
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4" style={{ gap: embedded ? 4 : 8 }}>
          <MetricChip
            label="BPM"
            value={displayState.showCameraMetrics ? bpm : '--'}
            tone={displayState.showCameraMetrics && displayBpmQuality > 0.4 ? '#fb7185' : undefined}
          />
          <MetricChip label="HRV" value={displayState.showCameraMetrics ? hrv : '--'} />
          <MetricChip label="Resp" value={displayState.showCameraMetrics ? resp : '--'} />
          <MetricChip label="Sig" value={pct(displaySignalQuality)} tone={tone} />
        </div>

        {showAdvanced && (
          <div
            className="mt-3 rounded-md border"
            style={{
              padding: 10,
              background: 'rgba(0,0,0,0.18)',
              borderColor: 'rgba(255,255,255,0.09)',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(240,236,224,0.55)' }}>
                Advanced signals
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(240,236,224,0.48)' }}>
                Baseline delta {delta}
              </span>
            </div>
            <div className="text-[11px] leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
              Camera play uses signal quality, heart-rate trend, respiration proxy, and coverage for gentle flight
              notes. Weak-signal moments stay out of default insights.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
