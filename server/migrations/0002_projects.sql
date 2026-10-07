-- Better Auth schema is generated separately as 0001_auth.sql. No request-time migration.
CREATE TABLE user_usage (
  owner_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  stored_bytes INTEGER NOT NULL DEFAULT 0 CHECK (stored_bytes >= 0),
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0)
);
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 500),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  current_object_key TEXT NOT NULL UNIQUE,
  current_hash TEXT NOT NULL CHECK (length(current_hash) = 64),
  current_bytes INTEGER NOT NULL CHECK (current_bytes > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  commit_token TEXT NOT NULL,
  UNIQUE (id, owner_id),
  CHECK (deleted_at IS NULL OR length(deleted_at) > 0)
);
CREATE INDEX projects_owner_page ON projects(owner_id, deleted_at, id);
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('raster', 'source')),
  state TEXT NOT NULL CHECK (state IN ('pending', 'ready', 'cleanup')),
  object_key TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  hash TEXT NOT NULL CHECK (length(hash) = 64),
  mime TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE (id, owner_id),
  CHECK (kind <> 'raster' OR mime IN ('image/png', 'image/jpeg'))
);
CREATE INDEX assets_owner_state ON assets(owner_id, state, id);
CREATE TABLE quota_reservations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  expires_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'committed', 'released')),
  FOREIGN KEY (asset_id, owner_id) REFERENCES assets(id, owner_id)
);
CREATE INDEX reservations_owner_state ON quota_reservations(owner_id, state, expires_at);
CREATE TABLE project_versions (
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  object_key TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL CHECK (length(hash) = 64),
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_id, revision),
  UNIQUE (project_id, owner_id, revision),
  FOREIGN KEY (project_id, owner_id) REFERENCES projects(id, owner_id) ON DELETE CASCADE
);
CREATE TABLE version_assets (
  project_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  asset_id TEXT NOT NULL,
  PRIMARY KEY (project_id, revision, asset_id),
  FOREIGN KEY (project_id, owner_id, revision) REFERENCES project_versions(project_id, owner_id, revision) ON DELETE CASCADE,
  FOREIGN KEY (asset_id, owner_id) REFERENCES assets(id, owner_id)
);
CREATE TRIGGER version_asset_ready BEFORE INSERT ON version_assets
WHEN NOT EXISTS (SELECT 1 FROM assets WHERE id = NEW.asset_id AND owner_id = NEW.owner_id AND state = 'ready' AND deleted_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'Asset is unavailable'); END;
CREATE TABLE mutation_receipts (
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  mutation_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'save')),
  request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
  revision INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, mutation_id),
  FOREIGN KEY (project_id, owner_id, revision) REFERENCES project_versions(project_id, owner_id, revision)
);
CREATE INDEX receipts_expiration ON mutation_receipts(expires_at);
