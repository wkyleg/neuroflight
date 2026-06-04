import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MainMenu } from './MainMenu.tsx';

const navigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('MainMenu launch wizard', () => {
  beforeEach(() => {
    navigate.mockClear();
    window.localStorage.clear();
  });

  it('renders a guided launch flow with default selections', () => {
    render(<MainMenu />);

    expect(screen.getByRole('button', { name: /neuroflight home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /asset lab/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modezen flight/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aircraftsunny biplane/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /launch zen flight/i }).length).toBeGreaterThan(0);
  });

  it('updates the summary and keeps launch URL parameters stable', () => {
    render(<MainMenu />);

    fireEvent.click(screen.getByRole('button', { name: /dogfight/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /launch dogfight/i })[0]);

    expect(navigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/fly\?mode=dogfight&map=desert_expanse&aircraft=.*&difficulty=rookie$/),
    );
  });
});
