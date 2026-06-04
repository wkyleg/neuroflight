function envFlag(name: string): boolean {
  const value = import.meta.env[name];
  return value === '1' || value === 'true';
}

export const v1Flags = {
  EEG_ENABLED: envFlag('VITE_NEUROFLIGHT_EEG_ENABLED'),
  SIM_ENABLED: envFlag('VITE_NEUROFLIGHT_SIM_ENABLED'),
} as const;
