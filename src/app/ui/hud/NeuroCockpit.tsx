import { useNeuroConnection, useNeuroSignals } from '@/neuro/hooks.ts';
import { BandPowerBars } from './BandPowerBars.tsx';
import { BrainRing } from './BrainRing.tsx';
import { DeviceStatus } from './DeviceStatus.tsx';
import { MetricsColumn } from './MetricsColumn.tsx';

export function NeuroCockpit() {
  const neuro = useNeuroSignals();
  const connection = useNeuroConnection();

  return (
    <div className="absolute bottom-0 left-0 right-0" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Flight mechanics bar */}
      <div
        className="flex items-center justify-between tracking-wider"
        style={{
          background: 'rgba(10,10,16,0.96)',
          borderTop: '1px solid rgba(0,204,204,0.15)',
          padding: '0 40px',
          height: 38,
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-heading)' }}>NEUROFLIGHT</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>SOURCE: {neuro.source.toUpperCase()}</span>
        <span style={{ color: neuro.source !== 'none' ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)' }}>
          {neuro.source !== 'none' ? '● ACTIVE' : '○ NO DEVICE'}
        </span>
      </div>

      {/* Main neuro panel: 3 columns */}
      <div
        className="flex relative"
        style={{ height: 160, background: 'rgba(6,6,10,0.96)', borderTop: '1px solid rgba(0,204,204,0.08)' }}
      >
        {/* Scan-line overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 3px)',
          }}
        />

        {/* Left column (20%): device status + cam preview */}
        <div className="w-[20%] border-r" style={{ borderColor: 'rgba(0,204,204,0.1)', padding: '14px 20px' }}>
          <DeviceStatus
            source={neuro.source}
            eegConnected={connection.eegConnected}
            cameraActive={connection.cameraActive}
            signalQuality={neuro.signalQuality}
          />
        </div>

        {/* Center column (55%): band bars + brain ring */}
        <div
          className="w-[55%] flex border-r"
          style={{ borderColor: 'rgba(0,204,204,0.1)', padding: '14px 20px', gap: 20 }}
        >
          <div className="flex-1">
            <BandPowerBars
              alpha={neuro.alphaPower}
              beta={neuro.betaPower}
              theta={neuro.thetaPower}
              delta={neuro.deltaPower}
              gamma={neuro.gammaPower}
            />
          </div>
          <div className="w-24 flex items-center justify-center">
            <BrainRing calm={neuro.calm} arousal={neuro.arousal} />
          </div>
        </div>

        {/* Right column (25%): BPM, HRV, metrics */}
        <div className="w-[25%]" style={{ padding: '14px 20px' }}>
          <MetricsColumn
            bpm={neuro.bpm}
            bpmQuality={neuro.bpmQuality}
            hrvRmssd={neuro.hrvRmssd}
            respirationRate={neuro.respirationRate}
            signalQuality={neuro.signalQuality}
            calmnessState={neuro.calmnessState}
            alphaPeakFreq={neuro.alphaPeakFreq}
          />
        </div>
      </div>
    </div>
  );
}
