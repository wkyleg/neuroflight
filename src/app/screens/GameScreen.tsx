import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { FlightHud } from '@/app/ui/hud/FlightHud.tsx';
import { getAircraft } from '@/game/flight/AircraftRegistry.ts';
import { Game } from '@/game/Game.ts';
import type { GameMode } from '@/game/types.ts';
import { getMap } from '@/game/world/MapRegistry.ts';
import { useGameStore } from '@/stores/gameStore.ts';

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') ?? 'dogfight') as GameMode;
  const mapId = searchParams.get('map') ?? 'desert_expanse';
  const [loading, setLoading] = useState(true);

  const map = getMap(mapId);
  const aircraft = getAircraft('spitfire');

  const modeLabel = 'Dogfight';

  const initGame = useCallback(async () => {
    if (!canvasRef.current || gameRef.current) return;

    const game = new Game(canvasRef.current);
    gameRef.current = game;

    game.setOnSessionEnd(() => {
      navigate('/summary');
    });

    await game.init(mode, mapId);
    game.start();

    useGameStore.getState().setGame(game);
    setLoading(false);
  }, [mode, mapId, navigate]);

  useEffect(() => {
    initGame();
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
        useGameStore.getState().setGame(null);
      }
    };
  }, [initGame]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

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
            {map.name}
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', opacity: 0.6 }}
          >
            {aircraft.name} &middot; {modeLabel}
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
    </div>
  );
}
