-- ============================================================
-- The Reading Marathon by Speaking Fraternity — Database Schema
-- ============================================================

-- USERS (fraternity members)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  initials      TEXT NOT NULL,              -- e.g. "AH" for avatar badge
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color  TEXT DEFAULT '#1B3A2D',     -- hex color for avatar background
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  streak_days   INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,                     -- 'YYYY-MM-DD', used to compute streaks
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SEASONS / MARATHON EVENTS (e.g. "Summer Reading Marathon · 2026")
-- Lets the fraternity run multiple marathons over time without losing history.
CREATE TABLE IF NOT EXISTS marathons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,                -- "Summer Reading Marathon"
  year        INTEGER NOT NULL,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- BOOKS (catalog — title/author/page count, reusable across members)
CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  author      TEXT,
  total_pages INTEGER NOT NULL,
  spine_color TEXT DEFAULT '#2D6A4F',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- READING ENTRIES (a member reading a specific book — powers the shelf,
-- progress cards, and leaderboard)
CREATE TABLE IF NOT EXISTS reading_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  marathon_id   INTEGER REFERENCES marathons(id) ON DELETE SET NULL,
  current_page  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'on_track'
                  CHECK (status IN ('on_track', 'behind', 'finished')),
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reading_entries_user ON reading_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_entries_book ON reading_entries(book_id);

-- PAGE LOGS (each time a member logs pages — powers "pages this week" leaderboard
-- and the streak counter, independent of the running total on reading_entries)
CREATE TABLE IF NOT EXISTS page_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_entry_id  INTEGER NOT NULL REFERENCES reading_entries(id) ON DELETE CASCADE,
  pages_read        INTEGER NOT NULL CHECK (pages_read > 0),
  logged_on         TEXT NOT NULL DEFAULT (date('now')), -- 'YYYY-MM-DD'
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_logs_user_date ON page_logs(user_id, logged_on);

-- FEED POSTS (unified table for the 4 composer tabs:
-- progress_update | quote | note | discussion)
CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('progress_update','quote','note','discussion')),
  body          TEXT NOT NULL,
  book_id       INTEGER REFERENCES books(id) ON DELETE SET NULL,
  page_number   INTEGER,                    -- relevant mainly for quotes
  reading_entry_id INTEGER REFERENCES reading_entries(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

-- POST REACTIONS ("resonated" hearts on quotes/posts)
CREATE TABLE IF NOT EXISTS post_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL DEFAULT 'resonate',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id, reaction)
);

-- POST COMMENTS (powers "Discuss")
CREATE TABLE IF NOT EXISTS post_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SAVED NOTES (the "Save to notes" quote action — per-user saved items)
CREATE TABLE IF NOT EXISTS saved_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, post_id)
);

-- GOALS (per-member checklist e.g. "Read 30 minutes today")
CREATE TABLE IF NOT EXISTS goals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_done     INTEGER NOT NULL DEFAULT 0,
  due_date    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- EVENTS (Fraternity Events sidebar)
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TEXT NOT NULL,                -- 'YYYY-MM-DD'
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
