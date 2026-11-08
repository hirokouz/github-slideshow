/* yokozuna-hit: 「横綱への道」の利用記録を受け取り、管理画面を出す Worker
   - POST /e      ゲームから届く記録 {vid, src, ev, detail, lang}  → D1 events に保存（ctx.waitUntil で非同期）
   - GET  /admin?key=…&days=30   管理画面（HTML）
   - GET  /stats?key=…&days=30   同じ集計を JSON で
   個人情報は保存しない：vid は端末ごとのランダムな番号、IP は保存しない
   バインディング：DB（D1 yokozuna-analytics）　シークレット：ADMIN_KEY（管理画面の合言葉） */
const ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?yokozuna-sumo\.pages\.dev$/;
const EVENTS = new Set(['open', 'start', 'basho', 'promo', 'retire', 'lang', 'share']);
// SNS の参照元（アプリ内ブラウザやリンク短縮のホスト名）を SNS 名にまとめる。?from= の値はそのまま
const SNS = [[/^(t\.co|(mobile\.)?(x|twitter)\.com)$/, 'x'], [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)facebook\.com$|^fb\.me$/, 'facebook'],
  [/(^|\.)threads\.(net|com)$/, 'threads'], [/(^|\.)tiktok\.com$/, 'tiktok'], [/(^|\.)line\.me$/, 'line'], [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube'],
  [/(^|\.)bsky\.app$/, 'bluesky'], [/(^|\.)note\.com$/, 'note'], [/(^|\.)reddit\.com$/, 'reddit']];
const normSrc = s => { for (const [re, n] of SNS) if (re.test(s)) return n; return s; };
const day = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10); // 日本時間の日付
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, n);
const cors = o => ORIGIN_RE.test(o || '') ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};

async function stats(env, days) {
  const since = day(new Date(Date.now() - (days - 1) * 86400e3));
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results || []);
  const [sources, daily, funnel, retention, basho, shares, recent] = await Promise.all([
    // 流入元ごと：期間内に開いた人数・新しく来た人数・合計の開いた回数
    q(`WITH first AS (SELECT vid, MIN(day) AS d0 FROM events GROUP BY vid)
       SELECT e.src, COUNT(DISTINCT e.vid) AS users,
              COUNT(DISTINCT CASE WHEN f.d0 >= ?1 THEN e.vid END) AS new_users,
              SUM(e.ev = 'open') AS opens
       FROM events e JOIN first f ON f.vid = e.vid
       WHERE e.day >= ?1 GROUP BY e.src ORDER BY users DESC`, since),
    // 日ごと・流入元ごとの利用者数
    q(`SELECT day, src, COUNT(DISTINCT vid) AS users FROM events WHERE day >= ?1 GROUP BY day, src ORDER BY day DESC, users DESC`, since),
    // どこまで進んだか（期間内に来た人のうち、その段階に届いた人数）
    q(`WITH u AS (SELECT DISTINCT vid, src FROM events WHERE day >= ?1)
       SELECT u.src, COUNT(*) AS users,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='start')) AS started,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='basho')) AS played_basho,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='promo' AND e.detail='juryo')) AS juryo,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='promo' AND e.detail='makuuchi')) AS makuuchi,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='promo' AND e.detail='ozeki')) AS ozeki,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='promo' AND e.detail='yokozuna')) AS yokozuna
       FROM u GROUP BY u.src ORDER BY users DESC`, since),
    // また来たか：初めて来た日の翌日・7日以降に、もう一度開いた人の割合
    q(`WITH f AS (SELECT vid, MIN(src) AS src, MIN(day) AS d0 FROM events GROUP BY vid HAVING MIN(day) >= ?1)
       SELECT f.src, COUNT(*) AS new_users,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=f.vid AND e.day = date(f.d0,'+1 day'))) AS came_next_day,
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=f.vid AND e.day >= date(f.d0,'+7 day'))) AS came_after_7days,
         SUM(f.d0 <= date(?2,'-1 day')) AS eligible_next_day,
         SUM(f.d0 <= date(?2,'-7 day')) AS eligible_7days
       FROM f GROUP BY f.src ORDER BY new_users DESC`, since, day()),
    // 1人あたりの場所数
    q(`SELECT src, COUNT(*) AS basho, COUNT(DISTINCT vid) AS players, ROUND(COUNT(*)*1.0/COUNT(DISTINCT vid),1) AS per_player
       FROM events WHERE ev='basho' AND day >= ?1 GROUP BY src ORDER BY basho DESC`, since),
    // シェア：どの場面で、何で（スマホの共有メニュー sheet ／ X）シェアされたか
    q(`SELECT detail, COUNT(*) AS shares, COUNT(DISTINCT vid) AS users FROM events WHERE ev='share' AND day >= ?1 GROUP BY detail ORDER BY shares DESC`, since),
    q(`SELECT created_at, src, ev, detail, lang, substr(vid,1,6) AS vid FROM events ORDER BY id DESC LIMIT 50`),
  ]);
  return { since, until: day(), days, sources, daily, funnel, retention, basho, shares, recent };
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function table(title, note, rows, cols) {
  const head = cols.map(c => `<th>${esc(c[1])}</th>`).join('');
  const body = rows.length ? rows.map(r => '<tr>' + cols.map(c => `<td>${esc(typeof c[2] === 'function' ? c[2](r) : r[c[0]])}</td>`).join('') + '</tr>').join('') : `<tr><td colspan="${cols.length}" class="none">まだ記録がありません</td></tr>`;
  return `<section><h2>${esc(title)}</h2>${note ? `<p class="note">${esc(note)}</p>` : ''}<div class="wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}
const pct = (a, b) => b ? Math.round(a * 100 / b) + '%（' + a + '/' + b + '）' : '—';
const SRC_LABEL = { kokoshinro: '甲子園台帳のバナー', 'kokoshinro.com': '甲子園台帳のリンク', direct: '直接・不明。LINE などのアプリ内からも多い',
  share: 'プレイヤーのシェア・スマホの共有', share_x: 'プレイヤーのシェア・X', x: 'X', instagram: 'Instagram', ig: 'Instagram', facebook: 'Facebook', fb: 'Facebook',
  threads: 'Threads', tiktok: 'TikTok', line: 'LINE', youtube: 'YouTube', bluesky: 'Bluesky', note: 'note', reddit: 'Reddit' };
const SRC = s => { const b = String(s || '').split('_')[0], l = SRC_LABEL[s] || (b !== s && SRC_LABEL[b] && SRC_LABEL[b] + '・' + s.slice(b.length + 1)); return l ? s + '（' + l + '）' : s; };
const SHARE_LABEL = { juryo: '十両昇進', nyumaku: '新入幕', ozeki: '大関昇進', yokozuna: '横綱昇進', yusho: '幕内優勝', retire: '引退', sheet: 'スマホの共有', x: 'X' };
const shareLab = d => String(d || '').split('/').map(x => SHARE_LABEL[x] || x).join('・');
function page(d, key) {
  const k = encodeURIComponent(key);
  const tabs = [7, 30, 90].map(n => `<a href="?key=${k}&days=${n}" class="${n === d.days ? 'on' : ''}">過去${n}日</a>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>横綱への道 利用状況</title>
<style>:root{--bg:#f7f4ec;--fg:#1d1a16;--mut:#6b6458;--line:#ddd3bf;--acc:#9a2b25}@media (prefers-color-scheme:dark){:root{--bg:#141826;--fg:#f1ead8;--mut:#a59d8c;--line:#333a52;--acc:#e2b04a}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif}main{max-width:900px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:4px 0}h2{font-size:16px;margin:24px 0 6px;color:var(--acc)}.note{color:var(--mut);font-size:13px;margin:0 0 6px}.tabs a{display:inline-block;margin:6px 6px 0 0;padding:4px 10px;border:1px solid var(--line);border-radius:999px;color:var(--fg);text-decoration:none;font-size:13px}.tabs a.on{background:var(--acc);border-color:var(--acc);color:#fff}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;white-space:nowrap}th{color:var(--mut);font-weight:600}td.none{color:var(--mut)}</style></head>
<body><main><h1>横綱への道 利用状況</h1><p class="note">${esc(d.since)} 〜 ${esc(d.until)}（日本時間）。人数は端末ごとに数えています（同じ人でもスマホとパソコンなら2人）。</p><div class="tabs">${tabs}</div>
${table('流入元ごとの人数', '期間内にゲームを開いた人数。「新しく来た人」は期間内に初めて来た人。', d.sources, [['src', '流入元', r => SRC(r.src)], ['users', '人数'], ['new_users', '新しく来た人'], ['opens', '開いた回数']])}
${table('どこまで遊んだか', '期間内に来た人のうち、その段階まで進んだ人数。', d.funnel, [['src', '流入元', r => SRC(r.src)], ['users', '来た人'], ['started', '入門した'], ['played_basho', '場所を戦った'], ['juryo', '十両'], ['makuuchi', '幕内'], ['ozeki', '大関'], ['yokozuna', '横綱']])}
${table('また来たか（継続率）', '期間内に初めて来た人のうち、翌日／7日以降にもう一度開いた割合。まだ日数がたっていない人は分母に入れていません。', d.retention, [['src', '流入元', r => SRC(r.src)], ['new_users', '初めて来た人'], ['n', '翌日も来た', r => pct(r.came_next_day, r.eligible_next_day)], ['n7', '7日以降も来た', r => pct(r.came_after_7days, r.eligible_7days)]])}
${table('場所をどれくらい戦ったか', '期間内に終えた場所の数。', d.basho, [['src', '流入元', r => SRC(r.src)], ['basho', '場所数'], ['players', '遊んだ人'], ['per_player', '1人あたり']])}
${table('シェアされた回数', '昇進・優勝・引退の画面の「この記録をシェアする」。スマホの共有は、共有先を選んで送ったときだけ数える。シェアから来た人は流入元 share／share_x に出る。', d.shares, [['detail', '場面・方法', r => shareLab(r.detail)], ['shares', '回数'], ['users', '人数']])}
${table('日ごとの利用者', '', d.daily, [['day', '日付'], ['src', '流入元', r => SRC(r.src)], ['users', '人数']])}
${table('最近の記録（50件）', 'open=開いた／start=入門／basho=場所を終えた／promo=昇進／retire=引退／lang=言語を切りかえ／share=シェア', d.recent, [['created_at', '日時（日本時間）', r => new Date(new Date(r.created_at).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16)], ['src', '流入元'], ['ev', '記録'], ['detail', '内容'], ['lang', '言語'], ['vid', '端末']])}
</main></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname === '/e' && request.method === 'POST') {
      if (!ORIGIN_RE.test(origin)) return new Response(null, { status: 204 }); // 自分のサイト以外からは記録しない
      let b = {};
      try { b = JSON.parse((await request.text()).slice(0, 2000) || '{}'); } catch (e) {}
      const ev = clean(b.ev, 16);
      const vid = clean(b.vid, 40);
      if (EVENTS.has(ev) && /^[a-z0-9-]{8,40}$/i.test(vid)) {
        const src = /^[a-z0-9_.:-]{1,40}$/i.test(String(b.src || '')) ? normSrc(String(b.src).toLowerCase()) : 'other';
        const now = new Date();
        ctx.waitUntil(env.DB.prepare('INSERT INTO events (vid, src, ev, detail, lang, created_at, day) VALUES (?1,?2,?3,?4,?5,?6,?7)')
          .bind(vid, src, ev, clean(b.detail, 60), clean(b.lang, 5), now.toISOString(), day(now)).run().catch(e => console.log('insert failed', e && e.message)));
      }
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (url.pathname === '/admin' || url.pathname === '/stats') {
      const key = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('合言葉がちがいます', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
      const d = await stats(env, days);
      if (url.pathname === '/stats') return Response.json(d);
      return new Response(page(d, key), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    return new Response('not found', { status: 404 });
  },
};
