import { beforeEach, describe, expect, it } from 'vitest';
import { recordHelpDismissal, shouldShowInitialHelp } from './FlightHud.tsx';

describe('FlightHud help overlay preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('auto-shows only for the first two dismissals', () => {
    expect(shouldShowInitialHelp()).toBe(true);

    recordHelpDismissal();
    expect(shouldShowInitialHelp()).toBe(true);

    recordHelpDismissal();
    expect(shouldShowInitialHelp()).toBe(false);
  });

  it('honors never-show preference immediately', () => {
    recordHelpDismissal(true);

    expect(shouldShowInitialHelp()).toBe(false);
    expect(window.localStorage.getItem('neuroflight.help.neverShow')).toBe('true');
  });
});
