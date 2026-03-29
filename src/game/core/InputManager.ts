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

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.devCallbacks.forEach((cb) => cb(e.code));
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
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
  }
}
