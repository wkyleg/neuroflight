import logger from '@/neuro/logger.ts';

export interface FlightInput {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  boost: boolean;
  brake: boolean;
}

const INPUT_SMOOTHING = 2.5;
const INPUT_DECAY = 12.0;
const THROTTLE_SPEED = 0.5;
const BRAKE_DECEL = 1.2;

export class InputManager {
  private keys = new Set<string>();
  private throttle = 0.6;
  private smoothPitch = 0;
  private smoothRoll = 0;
  private smoothYaw = 0;
  private devCallbacks: ((key: string) => void)[] = [];
  private uiThrottleUp = false;
  private uiThrottleDown = false;
  private uiBrake = false;
  private uiBoost = false;
  private uiFire = false;
  private touchPitch = 0;
  private touchRoll = 0;
  private touchYaw = 0;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearInput);
    window.addEventListener('pointercancel', this.clearInput);
    window.addEventListener('pointerup', this.clearMomentaryUiInput);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.shouldIgnoreKeyboardEvent(e)) return;
    if (this.isFlightKey(e.code)) e.preventDefault();
    this.keys.add(e.code);
    if (!e.repeat) {
      this.devCallbacks.forEach((cb) => cb(e.code));
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clearInput();
  };

  private shouldIgnoreKeyboardEvent(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (!(target instanceof HTMLElement)) return false;
    const ignored = !!target.closest('input, textarea, select, [contenteditable="true"]');
    if (ignored && this.isFlightKey(e.code)) {
      logger.debug('Input', 'Ignored flight key from editable target', {
        code: e.code,
        tagName: target.tagName,
      });
    }
    return ignored;
  }

  private isFlightKey(code: string): boolean {
    return (
      code.startsWith('Arrow') ||
      code === 'Space' ||
      code === 'Enter' ||
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'KeyQ' ||
      code === 'KeyE' ||
      code === 'KeyB' ||
      code === 'KeyF' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight' ||
      code === 'ControlLeft' ||
      code === 'ControlRight'
    );
  }

  clearInput = (): void => {
    this.keys.clear();
    this.smoothPitch = 0;
    this.smoothRoll = 0;
    this.smoothYaw = 0;
    this.clearMomentaryUiInput();
  };

  private clearMomentaryUiInput = (): void => {
    this.uiThrottleUp = false;
    this.uiThrottleDown = false;
    this.uiBrake = false;
    this.uiBoost = false;
    this.uiFire = false;
    this.setTouchAxes({ pitch: 0, roll: 0, yaw: 0 });
  };

  onDevKey(cb: (key: string) => void): void {
    this.devCallbacks.push(cb);
  }

  setUiThrottle(up: boolean, down: boolean): void {
    this.uiThrottleUp = up;
    this.uiThrottleDown = down;
  }

  setUiBrake(active: boolean): void {
    this.uiBrake = active;
  }

  setUiBoost(active: boolean): void {
    this.uiBoost = active;
  }

  setUiFire(active: boolean): void {
    this.uiFire = active;
  }

  setTouchAxes(axes: { pitch: number; roll: number; yaw?: number }): void {
    this.touchPitch = Math.max(-1, Math.min(1, axes.pitch));
    this.touchRoll = Math.max(-1, Math.min(1, axes.roll));
    this.touchYaw = Math.max(-1, Math.min(1, axes.yaw ?? axes.roll * 0.35));
  }

  isUiFiring(): boolean {
    return this.uiFire;
  }

  wantsFire(): boolean {
    return this.uiFire || this.keys.has('Space') || this.keys.has('Enter') || this.keys.has('KeyF');
  }

  update(dt: number): void {
    let targetPitch = 0;
    let targetRoll = 0;
    let targetYaw = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) targetPitch += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) targetPitch -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) targetRoll -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) targetRoll += 1;
    if (this.keys.has('KeyQ')) targetYaw -= 1;
    if (this.keys.has('KeyE')) targetYaw += 1;

    targetPitch = Math.max(-1, Math.min(1, targetPitch + this.touchPitch));
    targetRoll = Math.max(-1, Math.min(1, targetRoll + this.touchRoll));
    targetYaw = Math.max(-1, Math.min(1, targetYaw + this.touchYaw));

    const rampUp = 1 - Math.exp(-INPUT_SMOOTHING * dt);
    const rampDown = 1 - Math.exp(-INPUT_DECAY * dt);

    this.smoothPitch += (targetPitch - this.smoothPitch) * (targetPitch !== 0 ? rampUp : rampDown);
    this.smoothRoll += (targetRoll - this.smoothRoll) * (targetRoll !== 0 ? rampUp : rampDown);
    this.smoothYaw += (targetYaw - this.smoothYaw) * (targetYaw !== 0 ? rampUp : rampDown);

    const isBraking = this.keys.has('KeyB') || this.uiBrake;

    if (isBraking) {
      this.throttle = Math.max(0, this.throttle - BRAKE_DECEL * dt);
    } else if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.uiThrottleUp) {
      this.throttle = Math.min(1, this.throttle + THROTTLE_SPEED * dt);
    } else if (this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.uiThrottleDown) {
      this.throttle = Math.max(0, this.throttle - THROTTLE_SPEED * dt);
    }
  }

  getInput(): FlightInput {
    return {
      pitch: this.smoothPitch,
      roll: this.smoothRoll,
      yaw: this.smoothYaw,
      throttle: this.throttle,
      boost: this.uiBoost,
      brake: this.keys.has('KeyB') || this.uiBrake,
    };
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearInput);
    window.removeEventListener('pointercancel', this.clearInput);
    window.removeEventListener('pointerup', this.clearMomentaryUiInput);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.clearInput();
  }
}
