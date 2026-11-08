# 流入元カウンター（?from=）

> **いまは使っていない（未設定）。** Worker `yokozuna-hit` の作成とD1のバインディング設定が必要なため、現在は Web Analytics の参照元で確認している。使うときは、game.html に合図を送るコード（コミット b42d58f を参照）を戻し、下の手順で Worker を公開する。D1 `yokozuna-analytics` は作成済み。

`https://yokozuna-sumo.pages.dev/?from=kokoshinro` のように `?from=` 付きで来た訪問を、日ごと・流入元ごとに数える。

## しくみ
- ゲームのページ（game.html の先頭）が、`?from=` があるときだけ、Worker `yokozuna-hit` に1回だけ合図を送る（同じタブの再読み込みでは送らない）。送ったあと、アドレスバーから `?from=` を消す。
- Worker が D1 `yokozuna-analytics` の `visits` に書き込む（`ctx.waitUntil` で非同期。ページの表示は止まらない）。
- 生のIPは保存しない。`visitor_hash = SHA-256(VISITOR_SALT | JSTの日付 | IP | User-Agent)` の先頭32文字だけ。同じ人は1日1人として数える。
- `from` の値は英数字・`_`・`-` の32文字まで。それ以外は `other`。ほかのサイトに貼るバナーも `?from=名前` を付ければ同じように数えられる。
- Pages はダッシュボードのドラッグ＆ドロップで公開しているため、Pages Functions（`functions/`）は使えない（Cloudflareの既知の制限）。そのため計測は別の Worker にした。

## ファイル
| ファイル | 内容 |
|---|---|
| `hit-worker.js` | Worker のコード（`POST /hit` で記録、`GET /stats?days=7&key=…` で集計） |
| `schema.sql` | D1 のテーブル定義（作成済み） |
| `queries.sql` | 過去7日の流入元別「訪問数」「ユニーク人数」などのSQL |
| `wrangler.toml` | コマンドで公開する場合の設定（ダッシュボードで公開するなら不要） |

## D1
- データベース名：`yokozuna-analytics`（ID `68feff66-e5fd-4699-a5d1-6162e0d46689`、場所 APAC）— 作成済み・テーブル作成済み
- コマンドで作り直す場合：`npx wrangler d1 create yokozuna-analytics` → `npx wrangler d1 execute yokozuna-analytics --remote --file=schema.sql`

## Worker の公開（ダッシュボード）
1. Workers & Pages →「作成」→ Worker を作成。名前は **`yokozuna-hit`**（ゲーム側の送り先が `https://yokozuna-hit.j2prco.workers.dev/hit` なので、この名前にする）→ デプロイ
2. 「コードを編集」→ `hit-worker.js` の中身を全部貼り付け →「デプロイ」
3. 「設定」→「バインディング」→「追加」→ D1 データベース。変数名 **`DB`**、データベース **`yokozuna-analytics`**
4. 「設定」→「変数とシークレット」→ シークレットを2つ追加
   - `VISITOR_SALT`：長いランダムな文字列（一度決めたら変えない。変えると同じ人の判定がリセットされる）
   - `STATS_KEY`：集計を見るときの合言葉
5. コマンドの場合：`npx wrangler deploy`（このフォルダで）→ `npx wrangler secret put VISITOR_SALT` / `STATS_KEY`

## 見方
- ブラウザで `https://yokozuna-hit.j2prco.workers.dev/stats?days=7&key=（STATS_KEY）`
- D1 のコンソールで `queries.sql` の SQL を実行
- コマンド：`npx wrangler d1 execute yokozuna-analytics --remote --command "（SQL）"`

計測できるのは導入した日以降。導入前の参考値は Web Analytics の Referer（kokoshinro.com）で見る。
