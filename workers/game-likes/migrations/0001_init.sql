CREATE TABLE IF NOT EXISTS game_likes (
  game_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '/games/',
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, voter_hash)
);

CREATE INDEX IF NOT EXISTS idx_game_likes_game_id
  ON game_likes (game_id);

CREATE TABLE IF NOT EXISTS like_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
