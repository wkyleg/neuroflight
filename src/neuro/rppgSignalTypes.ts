export type RppgSignalStatus =
  | 'off'
  | 'permission_needed'
  | 'starting'
  | 'warming'
  | 'ready'
  | 'weak'
  | 'degraded'
  | 'behavior_only'
  | 'failed';

export type RppgSignalCoverageLabel = 'strong' | 'partial' | 'weak' | 'behavior_only';

export interface RppgSignalSnapshot {
  status: RppgSignalStatus;
  canPublish: boolean;
  displayBpm: number | null;
  bpmFresh: boolean;
  coverageTrailing: number;
  coverageSession: number;
  coverageLabel: RppgSignalCoverageLabel;
  userMessage: string;
  backendUnavailable: boolean;
  issueCodes: string[];
}

export const DEFAULT_RPPG_SIGNAL_SNAPSHOT: RppgSignalSnapshot = {
  status: 'off',
  canPublish: false,
  displayBpm: null,
  bpmFresh: false,
  coverageTrailing: 0,
  coverageSession: 0,
  coverageLabel: 'behavior_only',
  userMessage: 'Camera off.',
  backendUnavailable: false,
  issueCodes: [],
};
