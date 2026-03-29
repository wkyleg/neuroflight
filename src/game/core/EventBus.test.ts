import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from './EventBus.ts';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('on() subscribes and emit() invokes the callback', () => {
    const fn = vi.fn();
    bus.on('test', fn);
    bus.emit('test', 1, 'a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1, 'a');
  });

  it('off() unsubscribes', () => {
    const fn = vi.fn();
    bus.on('x', fn);
    bus.off('x', fn);
    bus.emit('x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('clear() removes all listeners', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('e1', a);
    bus.on('e2', b);
    bus.clear();
    bus.emit('e1');
    bus.emit('e2');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('supports multiple listeners for the same event', () => {
    const first = vi.fn();
    const second = vi.fn();
    bus.on('multi', first);
    bus.on('multi', second);
    bus.emit('multi', 42);
    expect(first).toHaveBeenCalledWith(42);
    expect(second).toHaveBeenCalledWith(42);
  });
});
