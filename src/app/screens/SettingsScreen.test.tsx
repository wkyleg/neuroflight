import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BINAURAL_ENABLED_KEY } from '@/game/core/ProceduralFlightMusicSystem.ts';
import type { Game } from '@/game/Game.ts';
import { useGameStore } from '@/stores/gameStore.ts';
import { SettingsScreen } from './SettingsScreen.tsx';

const navigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('SettingsScreen binaural toggle', () => {
  beforeEach(() => {
    navigate.mockClear();
    window.localStorage.clear();
    useGameStore.getState().setGame(null);
  });

  it('defaults the optional binaural layer on and persists opt-out when no game is active', () => {
    render(<SettingsScreen />);

    expect(screen.getByRole('button', { name: /binaural layer on/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /binaural layer on/i }));

    expect(window.localStorage.getItem(BINAURAL_ENABLED_KEY)).toBe('false');
    expect(screen.getByRole('button', { name: /binaural layer off/i })).toBeInTheDocument();
  });

  it('updates the live game music system when a game is active', () => {
    const setBinauralEnabled = vi.fn();
    const game = {
      isBinauralEnabled: () => false,
      setBinauralEnabled,
    } as unknown as Game;
    useGameStore.getState().setGame(game);

    render(<SettingsScreen />);
    fireEvent.click(screen.getByRole('button', { name: /binaural layer off/i }));

    expect(setBinauralEnabled).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem(BINAURAL_ENABLED_KEY)).toBeNull();
  });
});
