import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface ActiveLaunch {
  key: string;
  game: Game;
}

function launchErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return 'The flight scene could not finish loading.';
}

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const activeLaunchRef = useRef<ActiveLaunch | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') ?? 'dogfight') as GameMode;
  const mapId = searchParams.get('map') ?? 'desert_expanse';
  const aircraftId = searchParams.get('aircraft') ?? DEFAULT_AIRCRAFT_ID;
  const difficulty = parseDifficulty(searchParams.get('difficulty'));
  const tutorial = searchParams.get('tutorial') === '1';
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const showReadiness = useGameStore((s) => s.hud.sessionPhase === 'readiness' && !s.hud.tutorial);

  const map = getMap(mapId);
  const aircraft = getAircraft(aircraftId);

  const modeMeta = getModeMeta(mode);
  const launchKey = useMemo(
    () => [mode, mapId, aircraft.id, difficulty, tutorial ? 'tutorial' : 'session', retryNonce].join(':'),
    [mode, mapId, aircraft.id, difficulty, tutorial, retryNonce],
  );

  const clearPendingCleanup = useCallback(() => {
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  const destroyActiveLaunch = useCallback((reason: string) => {
    const active = activeLaunchRef.current;
    if (!active) return;

    logger.info('GameScreen', 'Destroying active launch', { reason, key: active.key });
    active.game.destroy();
    if (gameRef.current === active.game) gameRef.current = null;
    activeLaunchRef.current = null;
    useGameStore.getState().setGame(null);
  }, []);

  const initGame = useCallback(async () => {
    if (!canvasRef.current) return;

    clearPendingCleanup();

    const currentLaunch = activeLaunchRef.current;
    if (currentLaunch?.key === launchKey) return;
    if (currentLaunch) destroyActiveLaunch('launch-params-changed');

    logger.info('GameScreen', 'Mounting game screen', {
      mode,
      mapId,
      aircraftId: aircraft.id,
      difficulty,
      tutorial,
      launchKey,
    });
    setLoading(true);
    setEnding(false);
    setLaunchError(null);

    const game = new Game(canvasRef.current, { tutorial });
    gameRef.current = game;
    activeLaunchRef.current = { key: launchKey, game };

    game.setOnSessionEnding(() => {
      if (activeLaunchRef.current?.game !== game) return;
      logger.info('GameScreen', 'Session ending overlay shown');
      setEnding(true);
    });

    game.setOnSessionEnd(() => {
      if (activeLaunchRef.current?.game !== game) return;
      logger.info('GameScreen', 'Session end navigation', { tutorial });
      navigate(tutorial ? '/' : '/summary');
    });

    try {
      await game.init(mode, mapId, aircraft.id, difficulty);
    } catch (error) {
      logger.error('GameScreen', 'Game init failed', {
        launchKey,
        message: error instanceof Error ? error.message : String(error),
      });
      if (activeLaunchRef.current?.game === game) {
        game.destroy();
        gameRef.current = null;
        activeLaunchRef.current = null;
        useGameStore.getState().setGame(null);
        if (mountedRef.current) {
          setLaunchError(launchErrorMessage(error));
          setLoading(false);
        }
      }
      return;
    }

    if (!mountedRef.current || activeLaunchRef.current?.game !== game || activeLaunchRef.current.key !== launchKey) {
      logger.warn('GameScreen', 'Game init completed for stale launch; start skipped', { launchKey });
      return;
    }

    game.start();

    useGameStore.getState().setGame(game);
    setLoading(false);
  }, [aircraft.id, clearPendingCleanup, destroyActiveLaunch, difficulty, launchKey, mapId, mode, navigate, tutorial]);

  useEffect(() => {
    mountedRef.current = true;
    initGame();
    return () => {
      mountedRef.current = false;
      clearPendingCleanup();
      cleanupTimerRef.current = window.setTimeout(() => {
        cleanupTimerRef.current = null;
        if (mountedRef.current) return;
        if (activeLaunchRef.current?.key === launchKey) {
          destroyActiveLaunch('screen-unmounted');
        }
      }, 80);
    };
  }, [clearPendingCleanup, destroyActiveLaunch, initGame, launchKey]);

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

      {!loading && launchError && (
        <div
          className="absolute inset-0 z-[70] flex items-center justify-center px-6 text-center"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, rgba(38,59,65,0.82), rgba(4,12,16,0.96) 62%, rgba(0,0,0,0.98))',
            color: 'var(--color-text-primary)',
          }}
        >
          <section
            className="premium-glass-strong max-w-md rounded-xl border p-6"
            style={{ borderColor: 'rgba(255,255,255,0.18)' }}
          >
            <p className="menu-card-kicker">Launch interrupted</p>
            <h1 className="mt-2 text-3xl font-black" style={{ color: 'var(--color-accent-gold)' }}>
              Couldn't launch flight
            </h1>
            <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.72)' }}>
              {launchError}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => navigate('/')} className="glass-button rounded-lg px-5 py-3">
                Back to Menu
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLaunchError(null);
                  setRetryNonce((value) => value + 1);
                }}
                className="glass-button rounded-lg px-5 py-3"
              >
                Retry
              </button>
            </div>
          </section>
        </div>
      )}

      {!loading && !launchError && <FlightHud />}
      {!loading && !launchError && !tutorial && showReadiness && <ReadinessOverlay />}
      {!loading && !launchError && !tutorial && !showReadiness && <SessionBriefingOverlay />}
      {!loading && !launchError && !tutorial && !showReadiness && <RecoveryOverlay />}
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
