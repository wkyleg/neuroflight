import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import logger from './logger';

describe('logger', () => {
  beforeEach(() => {
    logger.clear();
    logger.setLevel('DEBUG');
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty after clear', () => {
    logger.info('t', 'a');
    logger.clear();
    expect(logger.getLogs()).toEqual([]);
  });

  it('records entries at or above min level in order', () => {
    logger.warn('src', 'hello', { x: 1 });
    logger.info('src2', 'world');
    const logs = logger.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe('WARN');
    expect(logs[0].source).toBe('src');
    expect(logs[0].msg).toBe('hello');
    expect(logs[0].meta).toEqual({ x: 1 });
    expect(logs[1].level).toBe('INFO');
    expect(logs[1].msg).toBe('world');
    expect(typeof logs[0].ts).toBe('number');
  });

  it('skips buffer and console when below min level', () => {
    logger.setLevel('WARN');
    logger.debug('x', 'ignored');
    logger.info('x', 'also ignored');
    expect(logger.getLogs()).toHaveLength(0);
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    logger.warn('x', 'kept');
    expect(logger.getLogs()).toHaveLength(1);
    expect(console.warn).toHaveBeenCalled();
  });

  it('routes levels to the matching console method', () => {
    logger.debug('d', 'm1');
    logger.info('d', 'm2');
    logger.warn('d', 'm3');
    logger.error('d', 'm4');
    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('setLevel and getLevel round-trip', () => {
    logger.setLevel('ERROR');
    expect(logger.getLevel()).toBe('ERROR');
    logger.setLevel('INFO');
    expect(logger.getLevel()).toBe('INFO');
  });

  it('setDebugEnabled toggles between DEBUG and INFO floor', () => {
    logger.setDebugEnabled(true);
    logger.debug('s', 'd');
    expect(logger.getLogs()).toHaveLength(1);
    logger.clear();
    logger.setDebugEnabled(false);
    logger.debug('s', 'd');
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('download triggers anchor click with blob URL in jsdom', () => {
    logger.info('t', 'line');
    const click = vi.fn();
    const createEl = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = createEl(tag);
      if (tag === 'a') el.click = click;
      return el;
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    logger.download('test-log.json');

    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalled();
  });

  it('exposes devtools helpers on window when available', () => {
    const w = window as unknown as Record<string, unknown>;
    expect(w.__ELATA_LOGGER__).toBeDefined();
    const api = w.__ELATA_LOGGER__ as {
      getLogs: () => unknown;
      clear: () => void;
    };
    expect(typeof api.getLogs).toBe('function');
    expect(typeof api.clear).toBe('function');
  });
});
