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
-- ユーザー（端末）ごとのプロフィール：1端末1行。端末の情報は記録のたびではなく、ここに最新のものだけを持つ
CREATE TABLE IF NOT EXISTS users (
  vid TEXT PRIMARY KEY,
  src TEXT,                   -- 最初の流入元
  dev TEXT,                   -- 端末のまとめ「iOS 15.2・Xアプリ｜JP｜NTT DOCOMO」（OS・ブラウザ・国・通信会社。IP は残さない）
  first_at TEXT,              -- 初めて来た日時（UTC）
  last_at TEXT                -- 最後に来た日時（UTC）
);
