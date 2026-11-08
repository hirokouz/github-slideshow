# 利用状況の記録と管理画面

「横綱への道」の公開サイト（yokozuna-sumo.pages.dev）で、どこから来た人が、どこまで遊んでいるかを記録して、管理画面で見る。

## 記録するもの（個人情報なし）
- 端末ごとのランダムな番号（ゲームが localStorage に作る。名前・IP・セーブデータは送らない）
- 最初に来たときの流入元：`?from=` の値（甲子園台帳のバナーは `kokoshinro`）→ なければ参照元のサイト名（例 `kokoshinro.com`）→ どちらもなければ `direct`
- 出来事：`open`（開いた）、`start`（入門）、`basho`（場所を終えた：段と勝敗）、`promo`（juryo / makuuchi / ozeki / yokozuna）、`retire`（引退：最高位）、`lang`（言語の切りかえ）
- 送るのは公開サイトで動いているときだけ。タイトル画面の下に、記録していることを表示している

## 構成
| もの | 内容 |
|---|---|
| ゲーム（game.html の `LOG(...)`） | 出来事を `https://yokozuna-hit.j2prco.workers.dev/e` に送る（sendBeacon） |
| Worker `yokozuna-hit`（`worker.js`） | 受け取って D1 に保存（`ctx.waitUntil`）。`/admin?key=…` で管理画面、`/stats?key=…` で JSON |
| D1 `yokozuna-analytics`（ID `68feff66-e5fd-4699-a5d1-6162e0d46689`） | 表 `events`（`schema.sql`）。作成済み |

## Worker の公開（まだ）
- 名前：`yokozuna-hit`（ゲームの送り先がこの名前）
- コード：`worker.js`
- バインディング：D1 `yokozuna-analytics` を変数名 `DB` で
- シークレット：`ADMIN_KEY`（管理画面の合言葉）
- コマンドの場合：このフォルダで `npx wrangler deploy` → `npx wrangler secret put ADMIN_KEY`（`wrangler.toml` 用意済み）

## 見方
- 管理画面：`https://yokozuna-hit.j2prco.workers.dev/admin?key=（ADMIN_KEY）`（過去7日／30日／90日を切りかえ）
  - 流入元ごとの人数、どこまで遊んだか（入門・場所・十両・幕内・大関・横綱）、また来たか（翌日／7日以降）、1人あたりの場所数、日ごとの利用者、最近の記録
- SQL で見る：`queries.sql`

記録できるのは公開したあとから。人数は端末ごとなので、同じ人がスマホとパソコンで遊ぶと2人と数える。
