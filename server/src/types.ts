export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  APP_ORIGIN: string;
  ENVIRONMENT: 'development' | 'production';
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MAX_BODY_BYTES?: string;
  MAX_RASTER_BYTES?: string;
  MAX_SOURCE_BYTES?: string;
  MAX_PROJECTS?: string;
  MAX_USER_BYTES?: string;
}
export interface ProjectMetadata {
  id: string; name: string; revision: number; createdAt: string; updatedAt: string; deletedAt: string | null;
}
export type JsonObject = Record<string, any>;
export interface CloudContainer { format: 'floorplan-cloud'; version: 1; domain: JsonObject }
export interface ProjectRow {
  id: string; owner_id: string; name: string; revision: number; current_object_key: string;
  current_hash: string; current_bytes: number; created_at: string; updated_at: string; deleted_at: string | null;
}
export function metadata(p: ProjectRow): ProjectMetadata {
  return { id: p.id, name: p.name, revision: p.revision, createdAt: p.created_at, updatedAt: p.updated_at, deletedAt: p.deleted_at };
}
