-- Table notes (SQLite)

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Note sans titre',
  content     TEXT DEFAULT '',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_user     ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category_id);

CREATE TRIGGER IF NOT EXISTS trg_notes_updated_at
AFTER UPDATE ON notes FOR EACH ROW
BEGIN
  UPDATE notes SET updated_at = datetime('now') WHERE id = OLD.id;
END;
