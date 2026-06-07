import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager } from './InputManager.ts';

function keyDown(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
}

function keyUp(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
  });

  afterEach(() => {
    input.destroy();
  });

  it('adds key on keydown and removes on keyup', () => {
    keyDown('KeyW');
    expect(input.isKeyDown('KeyW')).toBe(true);
    keyUp('KeyW');
    expect(input.isKeyDown('KeyW')).toBe(false);
  });

  it('getInput() reflects pitch/roll/yaw for key combinations after update', () => {
    keyDown('KeyW');
    keyDown('KeyD');
    keyDown('KeyE');
    input.update(0.5);
    const flight = input.getInput();
    expect(flight.pitch).toBeGreaterThan(0);
    expect(flight.roll).toBeGreaterThan(0);
    expect(flight.yaw).toBeGreaterThan(0);
  });

  it('update() smooths axes toward targets and decays when keys released', () => {
    keyDown('KeyW');
    input.update(0.2);
    const peaked = input.getInput().pitch;
    expect(peaked).toBeGreaterThan(0);
    keyUp('KeyW');
    for (let i = 0; i < 20; i++) input.update(0.05);
    expect(input.getInput().pitch).toBeLessThan(peaked);
    expect(input.getInput().pitch).toBeLessThan(0.05);
  });

  it('increases throttle with Shift and decreases with Ctrl when not braking', () => {
    const start = input.getInput().throttle;
    keyDown('ShiftLeft');
    input.update(0.2);
    expect(input.getInput().throttle).toBeGreaterThan(start);
    keyUp('ShiftLeft');
    keyDown('ControlLeft');
    input.update(0.5);
    expect(input.getInput().throttle).toBeLessThan(start + 0.2);
  });

  it('wantsFire() for Space, Enter, and KeyF', () => {
    expect(input.wantsFire()).toBe(false);
    keyDown('Space');
    expect(input.wantsFire()).toBe(true);
    keyUp('Space');
    keyDown('Enter');
    expect(input.wantsFire()).toBe(true);
    keyUp('Enter');
    keyDown('KeyF');
    expect(input.wantsFire()).toBe(true);
  });

  it('clears held controls when the window loses focus', () => {
    keyDown('KeyW');
    input.update(0.2);
    expect(input.isKeyDown('KeyW')).toBe(true);
    window.dispatchEvent(new Event('blur'));
    expect(input.isKeyDown('KeyW')).toBe(false);
    expect(input.getInput().pitch).toBe(0);
  });

  it('keeps flight keys live after focused HUD buttons', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(input.wantsFire()).toBe(true);
    button.remove();
  });

  it('still ignores gameplay key presses from editable fields', () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    expect(input.wantsFire()).toBe(false);
    field.remove();
  });

  it('isUiFiring() reflects setUiFire()', () => {
    expect(input.isUiFiring()).toBe(false);
    input.setUiFire(true);
    expect(input.isUiFiring()).toBe(true);
    expect(input.wantsFire()).toBe(true);
    input.setUiFire(false);
    expect(input.isUiFiring()).toBe(false);
  });

  it('uses touch axes for mobile pitch, roll, and yaw', () => {
    input.setTouchAxes({ pitch: 0.8, roll: -0.6 });
    input.update(0.5);
    const flight = input.getInput();
    expect(flight.pitch).toBeGreaterThan(0);
    expect(flight.roll).toBeLessThan(0);
    expect(flight.yaw).toBeLessThan(0);

    window.dispatchEvent(new PointerEvent('pointerup'));
    for (let i = 0; i < 20; i++) input.update(0.05);
    expect(input.getInput().pitch).toBeLessThan(0.05);
    expect(Math.abs(input.getInput().roll)).toBeLessThan(0.05);
  });

  it('clears momentary UI controls on global pointer release', () => {
    input.setUiFire(true);
    input.setUiBoost(true);
    input.setUiBrake(true);
    input.setUiThrottle(true, false);
    expect(input.wantsFire()).toBe(true);
    expect(input.getInput().boost).toBe(true);
    expect(input.getInput().brake).toBe(true);

    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(input.wantsFire()).toBe(false);
    expect(input.getInput().boost).toBe(false);
    expect(input.getInput().brake).toBe(false);
  });

  it('destroy() removes window key listeners so keys stop updating state', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    input.destroy();
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('keyup', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('blur', expect.any(Function));
    remove.mockRestore();

    keyDown('KeyX');
    expect(input.isKeyDown('KeyX')).toBe(false);
  });
});
