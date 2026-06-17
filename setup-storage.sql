-- Stockage des images en SQLite
-- Les fichiers sont stockés sur le filesystem ; cette table garde leurs métadonnées.

CREATE TABLE IF NOT EXISTS storage_files (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket      TEXT NOT NULL DEFAULT 'card-images',
  file_path   TEXT NOT NULL UNIQUE,
  mime_type   TEXT,
  size_bytes  INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_storage_user   ON storage_files(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_bucket ON storage_files(bucket);

-- Vérifier la table
SELECT name, type FROM pragma_table_info('storage_files');
