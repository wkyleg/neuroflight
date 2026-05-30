import { useEffect, useMemo, useRef, useState } from 'react';
import { useNeuroConnection, useNeuroSignals } from '@/neuro/hooks.ts';
import { useNeuroStore } from '@/neuro/store.ts';
import { BandPowerBars } from './BandPowerBars.tsx';

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function signalTone(value: number): string {
  if (value >= 0.72) return '#42e9a8';
  if (value >= 0.38) return '#facc15';
  return '#fb7185';
}

function signalLabel(source: string, cameraActive: boolean, signalQuality: number): string {
  if (source === 'mock') return 'Simulated flight signals';
  if (source === 'eeg') return 'EEG connected';
  if (cameraActive || source === 'rppg') {
    if (signalQuality >= 0.72) return 'Camera signal ready';
    if (signalQuality >= 0.38) return 'Camera warming up';
    return 'More light or steadier face';
  }
  return 'Signals optional';
}

function MetricChip({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="rounded-md border"
      style={{
        minWidth: 74,
        padding: '7px 9px',
        background: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'rgba(240,236,224,0.55)' }}>
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums" style={{ color: tone ?? 'var(--color-text-primary)' }}>
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
            background: i < bars ? signalTone(value) : 'rgba(255,255,255,0.14)',
          }}
        />
      ))}
    </div>
  );
}

function CameraPreview({ active }: { active: boolean }) {
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
        host.removeChild(video);
      }
    };
  }, [active]);

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-md border"
      style={{
        width: 76,
        height: 46,
        background: 'linear-gradient(135deg, rgba(94,234,212,0.18), rgba(250,204,21,0.12))',
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

export function NeuroCockpit() {
  const neuro = useNeuroSignals();
  const connection = useNeuroConnection();
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const primary = useMemo(() => {
    if (neuro.source === 'eeg') return 'EEG';
    if (neuro.source === 'mock') return 'SIM';
    if (connection.cameraActive || neuro.source === 'rppg') return 'CAMERA';
    return 'OPTIONAL';
  }, [connection.cameraActive, neuro.source]);

  const label = signalLabel(neuro.source, connection.cameraActive, neuro.signalQuality);
  const tone = signalTone(neuro.signalQuality);
  const bpm = neuro.bpm !== null ? Math.round(neuro.bpm).toString() : '--';
  const hrv = neuro.hrvRmssd !== null ? `${Math.round(neuro.hrvRmssd)}ms` : '--';
  const resp = neuro.respirationRate !== null ? neuro.respirationRate.toFixed(1) : '--';
  const delta =
    neuro.baselineDelta !== null ? `${neuro.baselineDelta > 0 ? '+' : ''}${Math.round(neuro.baselineDelta)}` : '--';
  const showAdvanced = expanded || neuro.source === 'eeg';

  return (
    <div
      className="absolute left-6 bottom-6 pointer-events-auto"
      style={{
        width: showAdvanced ? 430 : 342,
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        className="rounded-lg border shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(7,20,28,0.72), rgba(18,26,26,0.58))',
          borderColor: 'rgba(94,234,212,0.22)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 14px 34px rgba(0,0,0,0.26)',
          padding: 12,
        }}
      >
        <div className="flex items-center justify-between" style={{ gap: 10 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <CameraPreview active={previewOpen && connection.cameraActive} />
            <div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(240,236,224,0.58)' }}>
                Camera biofeedback
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span className="text-sm font-bold" style={{ color: tone, fontFamily: 'var(--font-heading)' }}>
                  {primary}
                </span>
                <SignalBars value={neuro.signalQuality} />
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(240,236,224,0.72)' }}>
                {label}
              </div>
            </div>
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="rounded-md border text-[10px] font-bold"
              style={{
                minHeight: 30,
                padding: '5px 8px',
                borderColor: previewOpen ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.14)',
                color: previewOpen ? '#5eead4' : 'rgba(240,236,224,0.72)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              CAM
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border text-[10px] font-bold"
              style={{
                minHeight: 30,
                padding: '5px 8px',
                borderColor: showAdvanced ? 'rgba(250,204,21,0.52)' : 'rgba(255,255,255,0.14)',
                color: showAdvanced ? '#facc15' : 'rgba(240,236,224,0.72)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {showAdvanced ? 'LESS' : 'MORE'}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4" style={{ gap: 8 }}>
          <MetricChip label="BPM" value={bpm} tone={neuro.bpmQuality > 0.4 ? '#fb7185' : undefined} />
          <MetricChip label="HRV" value={hrv} />
          <MetricChip label="Resp" value={resp} />
          <MetricChip label="Sig" value={pct(neuro.signalQuality)} tone={tone} />
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
            {neuro.source === 'eeg' ? (
              <BandPowerBars
                alpha={neuro.alphaPower}
                beta={neuro.betaPower}
                theta={neuro.thetaPower}
                delta={neuro.deltaPower}
                gamma={neuro.gammaPower}
              />
            ) : (
              <div className="text-[11px] leading-5" style={{ color: 'rgba(240,236,224,0.68)' }}>
                EEG details stay tucked away unless a headband is active. Webcam play uses signal quality, heart-rate
                trend, respiration proxy, and coverage for gentle flight notes.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
