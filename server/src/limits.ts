import type { Env } from './types';
export function limits(env: Partial<Env>) {
  const value = (key: keyof Env, fallback: number) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isSafeInteger(n) || n <= 0) throw Error('Invalid limit configuration: ' + key);
    return n;
  };
  // Development ceilings only. Freeze production ceilings after remote CPU measurements.
  return { bodyBytes: value('MAX_BODY_BYTES', 1024 * 1024), rasterBytes: value('MAX_RASTER_BYTES', 3 * 1024 * 1024),
    sourceBytes: value('MAX_SOURCE_BYTES', 20 * 1024 * 1024), projects: value('MAX_PROJECTS', 20), userBytes: value('MAX_USER_BYTES', 100 * 1024 * 1024) };
}
