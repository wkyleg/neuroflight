import type { RppgAppSnapshot } from '@elata-biosciences/rppg-web';
import {
  DEFAULT_RPPG_SIGNAL_SNAPSHOT,
  type RppgSignalCoverageLabel,
  type RppgSignalSnapshot,
  type RppgSignalStatus,
} from './rppgSignalTypes.ts';

export interface RppgSignalGateContext {
  cameraActive: boolean;
  cameraError?: string | null;
  activeMs?: number;
  nowMs?: number;
}

const TRAILING_WINDOW_MS = 10_000;
const READY_STABLE_MS = 5_000;
const BPM_FRESH_MS = 3_000;
const NO_PUBLISH_TIMEOUT_MS = 20_000;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isPermissionError(error?: string | null): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes('permission') || normalized.includes('denied') || normalized.includes('blocked');
}

function coverageLabel(coverage: number): RppgSignalCoverageLabel {
  if (coverage >= 0.8) return 'strong';
  if (coverage >= 0.6) return 'partial';
  if (coverage >= 0.3) return 'weak';
  return 'behavior_only';
}

function messageFor(status: RppgSignalStatus): string {
  switch (status) {
    case 'permission_needed':
      return 'Allow camera access to enable biofeedback.';
    case 'starting':
      return 'Starting camera.';
    case 'warming':
      return 'Warming up signal. Face the screen and hold steady.';
    case 'ready':
      return 'Signal ready.';
    case 'weak':
      return 'Signal is weak. Add front light or center your face.';
    case 'degraded':
      return 'Partial signal.';
    case 'failed':
      return 'Biofeedback unavailable. You can still play behavior-only.';
    case 'behavior_only':
      return 'Behavior-only session.';
    default:
      return 'Camera off.';
  }
}

export class RppgSignalGate {
  private sessionMs = 0;
  private publishableMs = 0;
  private readyMs = 0;
  private trailing: Array<{ atMs: number; publishable: boolean }> = [];
  private lastPublishMs: number | null = null;

  update(dtMs: number, appSnapshot: RppgAppSnapshot | null, ctx: RppgSignalGateContext): RppgSignalSnapshot {
    const nowMs = ctx.nowMs ?? performance.now();
    const active = ctx.cameraActive || appSnapshot !== null;
    if (!active) return this.resetToOff(ctx);

    this.sessionMs += Math.max(0, dtMs);
    const canPublish = appSnapshot?.canPublish === true && appSnapshot.publishBpm !== null;
    if (canPublish) {
      this.publishableMs += Math.max(0, dtMs);
      this.readyMs += Math.max(0, dtMs);
      this.lastPublishMs = nowMs;
    } else {
      this.readyMs = 0;
    }

    this.trailing.push({ atMs: nowMs, publishable: canPublish });
    this.trailing = this.trailing.filter((item) => nowMs - item.atMs <= TRAILING_WINDOW_MS);

    const coverageTrailing =
      this.trailing.length > 0 ? this.trailing.filter((item) => item.publishable).length / this.trailing.length : 0;
    const coverageSession = this.sessionMs > 0 ? clamp01(this.publishableMs / this.sessionMs) : 0;
    const backendUnavailable =
      appSnapshot?.debug.backendMode === 'unavailable' || appSnapshot?.debug.processorFailure !== null;
    const issueCodes = appSnapshot?.debug.issues ?? [];

    let status = this.mapStatus(appSnapshot, {
      active,
      permissionError: isPermissionError(ctx.cameraError),
      activeMs: ctx.activeMs ?? this.sessionMs,
      backendUnavailable,
      coverageTrailing,
    });

    if (status === 'ready' && this.readyMs < READY_STABLE_MS) {
      status = 'warming';
    }

    const bpmFresh = this.lastPublishMs !== null && nowMs - this.lastPublishMs <= BPM_FRESH_MS;
    const displayBpm = status === 'ready' && bpmFresh ? (appSnapshot?.publishBpm ?? null) : null;

    return {
      status,
      canPublish: status === 'ready' && canPublish,
      displayBpm,
      bpmFresh,
      coverageTrailing,
      coverageSession,
      coverageLabel: coverageLabel(coverageSession),
      userMessage: messageFor(status),
      backendUnavailable,
      issueCodes,
    };
  }

  reset(): void {
    this.sessionMs = 0;
    this.publishableMs = 0;
    this.readyMs = 0;
    this.trailing = [];
    this.lastPublishMs = null;
  }

  private resetToOff(ctx: RppgSignalGateContext): RppgSignalSnapshot {
    this.reset();
    if (isPermissionError(ctx.cameraError)) {
      return {
        ...DEFAULT_RPPG_SIGNAL_SNAPSHOT,
        status: 'permission_needed',
        userMessage: messageFor('permission_needed'),
      };
    }
    return DEFAULT_RPPG_SIGNAL_SNAPSHOT;
  }

  private mapStatus(
    appSnapshot: RppgAppSnapshot | null,
    ctx: {
      active: boolean;
      permissionError: boolean;
      activeMs: number;
      backendUnavailable: boolean;
      coverageTrailing: number;
    },
  ): RppgSignalStatus {
    if (ctx.permissionError) return 'permission_needed';
    if (!ctx.active) return 'off';
    if (!appSnapshot) return ctx.activeMs > NO_PUBLISH_TIMEOUT_MS ? 'behavior_only' : 'starting';
    if (ctx.backendUnavailable) return 'failed';
    if (appSnapshot.status === 'failed') return 'failed';
    if (appSnapshot.status === 'degraded') return 'degraded';
    if (appSnapshot.status === 'starting' || appSnapshot.status === 'retrying') return 'starting';
    if (ctx.activeMs > NO_PUBLISH_TIMEOUT_MS && this.publishableMs <= 0) return 'behavior_only';

    const guidanceCode = appSnapshot.guidance?.code;
    if (guidanceCode === 'increase_lighting' || guidanceCode === 'no_face' || guidanceCode === 'motion_hold') {
      return 'weak';
    }
    if (appSnapshot.canPublish && appSnapshot.publishBpm !== null && ctx.coverageTrailing >= 0.7) return 'ready';
    return 'warming';
  }
}
