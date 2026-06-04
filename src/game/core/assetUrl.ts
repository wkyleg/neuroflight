import logger from '@/neuro/logger.ts';

export function resolveAssetUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\/+/, '');
  const resolved = `${cleanBase}${cleanPath}`;
  logger.debug('Assets', 'Resolved asset URL', { path, resolved, base });
  return resolved;
}
