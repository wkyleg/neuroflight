import { describe, expect, it } from 'vitest';
import { resolveAssetUrl } from './assetUrl.ts';

describe('resolveAssetUrl', () => {
  it('resolves root-relative public assets under the Vite base path', () => {
    expect(resolveAssetUrl('/assets/aircraft/test.glb')).toBe('/assets/aircraft/test.glb');
  });

  it('leaves absolute external and data URLs alone', () => {
    expect(resolveAssetUrl('https://example.com/a.glb')).toBe('https://example.com/a.glb');
    expect(resolveAssetUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});
