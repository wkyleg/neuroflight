interface DeviceStatusProps {
  source: string;
  eegConnected: boolean;
  cameraActive: boolean;
  signalQuality: number;
}

export function DeviceStatus({ source, eegConnected, cameraActive, signalQuality }: DeviceStatusProps) {
  let icon: string;
  let iconColor: string;
  let statusLabel: string;

  if (source === 'eeg') {
    icon = '●';
    iconColor = '#44ff88';
    statusLabel = 'EEG CONNECTED';
  } else if (source === 'rppg') {
    icon = '●';
    iconColor = '#ffaa44';
    statusLabel = 'WEBCAM ACTIVE';
  } else if (source === 'mock') {
    icon = '◇';
    iconColor = '#666688';
    statusLabel = 'SIMULATED';
  } else {
    icon = '✕';
    iconColor = '#ff4444';
    statusLabel = 'NO DEVICE';
  }

  const qualityBars = Math.round(signalQuality * 5);

  return (
    <div className="flex flex-col h-full justify-center" style={{ gap: 10 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span style={{ color: iconColor, fontSize: 12 }}>{icon}</span>
        <span className="tracking-wider" style={{ color: iconColor, fontSize: 11 }}>
          {statusLabel}
        </span>
      </div>

      {source !== 'none' && (
        <div className="flex items-center" style={{ gap: 6 }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 9 }}>SIG</span>
          <div className="flex" style={{ gap: 2 }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: 4,
                  height: 8 + i * 3,
                  background: i < qualityBars ? '#00cccc' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex" style={{ gap: 10, fontSize: 10 }}>
        <span style={{ color: eegConnected ? '#44ff88' : 'rgba(255,255,255,0.2)' }}>EEG</span>
        <span style={{ color: cameraActive ? '#ffaa44' : 'rgba(255,255,255,0.2)' }}>CAM</span>
      </div>
    </div>
  );
}
