import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/stores/gameStore.ts';
import { GameScreen } from './GameScreen.tsx';

interface MockGameInstance {
  init: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  setOnSessionEnd: ReturnType<typeof vi.fn>;
  setOnSessionEnding: ReturnType<typeof vi.fn>;
}

const gameMock = vi.hoisted(() => ({
  instances: [] as MockGameInstance[],
  initQueue: [] as Array<() => Promise<void>>,
}));

vi.mock('@/game/Game.ts', () => ({
  Game: vi.fn(function MockGame() {
    const initFactory = gameMock.initQueue.shift() ?? (() => Promise.resolve());
    const instance: MockGameInstance = {
      init: vi.fn(initFactory),
      start: vi.fn(),
      destroy: vi.fn(),
      setOnSessionEnd: vi.fn(),
      setOnSessionEnding: vi.fn(),
    };
    gameMock.instances.push(instance);
    return instance;
  }),
}));

vi.mock('@/app/ui/hud/FlightHud.tsx', () => ({
  FlightHud: () => <div data-testid="flight-hud">Flight HUD</div>,
}));

vi.mock('@/app/ui/hud/ReadinessOverlay.tsx', () => ({
  ReadinessOverlay: () => <div data-testid="readiness-overlay">Readiness</div>,
}));

vi.mock('@/app/ui/hud/RecoveryOverlay.tsx', () => ({
  RecoveryOverlay: () => <div data-testid="recovery-overlay">Recovery</div>,
}));

vi.mock('@/app/ui/hud/SessionBriefingOverlay.tsx', () => ({
  SessionBriefingOverlay: () => <div data-testid="briefing-overlay">Session briefing</div>,
}));

vi.mock('@/neuro/logger.ts', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderGame(route = '/fly?mode=dogfight&map=desert_expanse&aircraft=spitfire&difficulty=rookie') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <GameScreen />
    </MemoryRouter>,
  );
}

describe('GameScreen launch lifecycle', () => {
  beforeEach(() => {
    gameMock.instances.length = 0;
    gameMock.initQueue.length = 0;
    useGameStore.getState().setGame(null);
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    useGameStore.getState().setGame(null);
  });

  it('keeps an in-flight launch alive across StrictMode cleanup and clears loading', async () => {
    const init = deferred<void>();
    gameMock.initQueue.push(() => init.promise);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/fly?mode=dogfight&map=desert_expanse&aircraft=spitfire&difficulty=rookie']}>
          <GameScreen />
        </MemoryRouter>
      </StrictMode>,
    );

    expect(screen.getByText('LOADING')).toBeInTheDocument();

    await act(async () => {
      init.resolve();
      await init.promise;
    });

    await waitFor(() => expect(screen.queryByText('LOADING')).not.toBeInTheDocument());
    expect(screen.getByTestId('flight-hud')).toBeInTheDocument();
    expect(gameMock.instances).toHaveLength(1);
    expect(gameMock.instances[0].start).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable launch error instead of hanging forever when init fails', async () => {
    gameMock.initQueue.push(() => Promise.reject(new Error('asset exploded')));

    renderGame();

    await waitFor(() => expect(screen.getByText("Couldn't launch flight")).toBeInTheDocument());

    expect(screen.queryByText('LOADING')).not.toBeInTheDocument();
    expect(screen.getByText('asset exploded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to menu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(gameMock.instances[0].destroy).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().game).toBeNull();
  });
});
