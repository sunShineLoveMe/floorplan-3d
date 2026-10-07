import { DatabaseSync } from 'node:sqlite';
import { createAuth } from '../src/auth';
import type { Env } from '../src/types';
// Better Auth's official CLI introspects this empty ephemeral SQLite database.
// SQLite SQL is reviewed and applied by Wrangler to D1; this never touches runtime data.
export const auth = createAuth({
  DB: new DatabaseSync(':memory:') as unknown as D1Database,
  APP_ORIGIN: 'http://127.0.0.1:8787', ENVIRONMENT: 'development',
  BETTER_AUTH_SECRET: 'schema-generation-only-not-a-runtime-secret', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: ''
} as Env);
