import { betterAuth } from 'better-auth';
import type { Env } from './types';
import { ApiError } from './errors';
export function createAuth(env: Env) {
  const origin = new URL(env.APP_ORIGIN);
  const local = ['127.0.0.1', 'localhost'].includes(origin.hostname);
  if (env.ENVIRONMENT === 'production' && origin.protocol !== 'https:') throw Error('Production requires HTTPS');
  if (origin.protocol !== 'https:' && !local) throw Error('Auth requires HTTPS or loopback');
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32 || env.BETTER_AUTH_SECRET.startsWith('replace-')) throw new ApiError('AUTH_NOT_CONFIGURED', 503);
  return betterAuth({
    appName: 'Floor Plan Designer', baseURL: origin.origin, basePath: '/api/auth', secret: env.BETTER_AUTH_SECRET,
    database: env.DB, trustedOrigins: [origin.origin],
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID.startsWith('replace-')
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } } : {},
    emailAndPassword: { enabled: false },
    session: { cookieCache: { enabled: false }, deferSessionRefresh: true },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] }, useSecureCookies: origin.protocol === 'https:', defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' } },
    rateLimit: { enabled: true, storage: 'database', modelName: 'rateLimit' }
  });
}
