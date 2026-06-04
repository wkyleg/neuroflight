import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { FlightHud } from '@/app/ui/hud/FlightHud.tsx';
import { ReadinessOverlay } from '@/app/ui/hud/ReadinessOverlay.tsx';
import { RecoveryOverlay } from '@/app/ui/hud/RecoveryOverlay.tsx';
import { SessionBriefingOverlay } from '@/app/ui/hud/SessionBriefingOverlay.tsx';
import { DEFAULT_AIRCRAFT_ID, getAircraft } from '@/game/flight/AircraftRegistry.ts';
import { Game } from '@/game/Game.ts';
import { getModeMeta } from '@/game/modes.ts';
import type { GameDifficulty, GameMode } from '@/game/types.ts';
import { getMap } from '@/game/world/MapRegistry.ts';
import logger from '@/neuro/logger.ts';
import { useGameStore } from '@/stores/gameStore.ts';

function parseDifficulty(value: string | null): GameDifficulty {
  return value === 'pilot' || value === 'ace' || value === 'rookie' ? value : 'rookie';
}

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') ?? 'dogfight') as GameMode;
  const mapId = searchParams.get('map') ?? 'desert_expanse';
  const aircraftId = searchParams.get('aircraft') ?? DEFAULT_AIRCRAFT_ID;
  const difficulty = parseDifficulty(searchParams.get('difficulty'));
  const tutorial = searchParams.get('tutorial') === '1';
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const showReadiness = useGameStore((s) => s.hud.sessionPhase === 'readiness' && !s.hud.tutorial);

  const map = getMap(mapId);
  const aircraft = getAircraft(aircraftId);

  const modeMeta = getModeMeta(mode);

  const initGame = useCallback(async () => {
    if (!canvasRef.current || gameRef.current) return;

    logger.info('GameScreen', 'Mounting game screen', { mode, mapId, aircraftId: aircraft.id, difficulty, tutorial });
    setEnding(false);
    const game = new Game(canvasRef.current, { tutorial });
    gameRef.current = game;

    game.setOnSessionEnding(() => {
      logger.info('GameScreen', 'Session ending overlay shown');
      setEnding(true);
    });

    game.setOnSessionEnd(() => {
      logger.info('GameScreen', 'Session end navigation', { tutorial });
      navigate(tutorial ? '/' : '/summary');
    });

    await game.init(mode, mapId, aircraft.id, difficulty);
    if (gameRef.current !== game) {
      logger.warn('GameScreen', 'Game init completed after unmount; start skipped');
      return;
    }
    game.start();

    useGameStore.getState().setGame(game);
    setLoading(false);
  }, [mode, mapId, aircraft.id, difficulty, navigate, tutorial]);

  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        logger.info('GameScreen', 'Unmounting game screen');
        gameRef.current.destroy();
        gameRef.current = null;
        useGameStore.getState().setGame(null);
      }
    };
  }, [initGame]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`neuroflight-flight-canvas absolute inset-0 h-full w-full ${mode === 'dogfight' ? 'dogfight-cursor' : ''}`}
      />

      {loading && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'var(--color-bg-primary)' }}
        >
          <h2
            className="text-3xl font-bold tracking-wider"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-accent-gold)', marginBottom: 16 }}
          >
            LOADING
          </h2>
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', marginBottom: 12 }}
          >
            {map.storyName ?? map.name}
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', opacity: 0.6 }}
          >
            {aircraft.name} &middot; {tutorial ? 'Tutorial' : modeMeta.title} &middot; {difficulty.toUpperCase()}
          </p>
          <p className="mt-3 max-w-md text-center text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>
            {modeMeta.loadingLine}
          </p>
          <div
            className="w-32 h-0.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)', marginTop: 28 }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{ background: 'var(--color-accent-gold)', width: '60%' }}
            />
          </div>
        </div>
      )}

      {!loading && <FlightHud />}
      {!loading && !tutorial && showReadiness && <ReadinessOverlay />}
      {!loading && !tutorial && !showReadiness && <SessionBriefingOverlay />}
      {!loading && !tutorial && !showReadiness && <RecoveryOverlay />}
      {ending && (
        <div
          className="absolute inset-0 z-[70] flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, rgba(38,59,65,0.82), rgba(4,12,16,0.96) 62%, rgba(0,0,0,0.98))',
            color: 'var(--color-accent-gold)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: 4,
          }}
        >
          <div className="text-center">
            <div className="text-sm font-black uppercase" style={{ color: 'rgba(255,255,255,0.58)' }}>
              Preparing Debrief
            </div>
            <div className="mt-3 text-3xl font-black uppercase">Session Complete</div>
          </div>
        </div>
      )}
    </div>
  );
}
