-- D1: yokozuna-analytics（作成済み）。作り直すときに使う
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vid TEXT NOT NULL,          -- 端末ごとのランダムな番号（ゲームが localStorage に作る。個人とは結びつかない）
  src TEXT NOT NULL,          -- 最初に来たときの流入元（?from= の値、なければ参照元サイト名、どちらもなければ direct）
  ev TEXT NOT NULL,           -- open / start / basho / promo / retire / lang
  detail TEXT,                -- 内容（basho: 段と勝敗、promo: juryo/makuuchi/ozeki/yokozuna、retire: 最高位 など）
  lang TEXT,                  -- ja / en
  created_at TEXT NOT NULL,   -- UTC
  day TEXT NOT NULL           -- 日本時間の日付 YYYY-MM-DD
);
CREATE INDEX IF NOT EXISTS idx_events_day_src ON events(day, src);
CREATE INDEX IF NOT EXISTS idx_events_vid ON events(vid, day);
CREATE INDEX IF NOT EXISTS idx_events_ev ON events(ev, detail);
