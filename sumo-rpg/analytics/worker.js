/* yokozuna-hit: 「横綱への道」の利用記録を受け取り、管理画面を出す Worker
   - POST /e      ゲームから届く記録 {vid, src, ev, detail, lang}  → D1 events に保存（ctx.waitUntil で非同期）
   - GET  /admin?key=…&days=30   管理画面（HTML）
   - GET  /stats?key=…&days=30   同じ集計を JSON で
   個人情報は保存しない：vid は端末ごとのランダムな番号、IP は保存しない
   バインディング：DB（D1 yokozuna-analytics）　シークレット：ADMIN_KEY（管理画面の合言葉） */
const ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?yokozuna-sumo\.pages\.dev$/;
const EVENTS = new Set(['land', 'open', 'start', 'basho', 'promo', 'retire', 'lang', 'share', 'life', 'kikyo', 'gacha', 'auto', 'tut', 'err', 'reset']);
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
  const [sources, daily, funnel, retention, basho, shares, recent, acts, ranks] = await Promise.all([
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
         SUM(EXISTS(SELECT 1 FROM events e WHERE e.vid=u.vid AND e.ev='open')) AS loaded,
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
    // ゲーム内の出来事：イベントの選択・帰省・ガチャ・オート・遊び方の説明
    q(`SELECT ev, detail, COUNT(*) AS n, COUNT(DISTINCT vid) AS users FROM events WHERE ev IN ('life','kikyo','gacha','auto','tut') AND day >= ?1 GROUP BY ev, detail ORDER BY ev, n DESC`, since),
    // いまの番付：期間内に場所を終えた人それぞれの、最後の場所
    q(`SELECT detail FROM events WHERE id IN (SELECT MAX(id) FROM events WHERE ev='basho' AND day >= ?1 GROUP BY vid)`, since),
  ]);
  return { since, until: day(), days, sources, daily, funnel, retention, basho, shares, recent, acts, ranks };
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => b ? Math.round(a * 100 / b) + '%（' + a + '/' + b + '）' : '—';
const SRC_LABEL = { kokoshinro: '甲子園台帳のバナー', 'kokoshinro.com': '甲子園台帳のリンク', direct: '直接・不明。LINE などのアプリ内からも多い',
  share: 'プレイヤーのシェア・スマホの共有', share_x: 'プレイヤーのシェア・X', x: 'X', instagram: 'Instagram', ig: 'Instagram', facebook: 'Facebook', fb: 'Facebook',
  threads: 'Threads', tiktok: 'TikTok', line: 'LINE', youtube: 'YouTube', bluesky: 'Bluesky', note: 'note', reddit: 'Reddit',
  android: 'Android アプリ', pwa: 'ホーム画面のアイコンから', freem: 'ふりーむ！', plicy: 'PLiCy', itch: 'itch.io' };
const srcLab = s => { const b = String(s || '').split('_')[0]; return SRC_LABEL[s] || (b !== s && SRC_LABEL[b] && SRC_LABEL[b] + '・' + s.slice(b.length + 1)) || ''; };
const SHARE_LABEL = { juryo: '十両昇進', nyumaku: '新入幕', ozeki: '大関昇進', yokozuna: '横綱昇進', yusho: '幕内優勝', retire: '引退', sheet: 'スマホの共有（文章のみ）', sheet_img: 'スマホの共有（画像つき）', save: '画像を保存', x: 'X' };
const shareLab = d => String(d || '').split('/').map(x => SHARE_LABEL[x] || x).join('・');
const LIFE_LABEL = { juryo: '十両昇進', nyumaku: '新入幕', ozeki_up: '大関昇進', yokozuna_up: '横綱昇進', yusho_party: '優勝の祝勝会', congrat: 'お祝い', partner: '恋人・妻', tani: 'タニマチ', rival: '宿敵',
  meet: '出会い', confess: '告白', gift: '贈り物', visit: '会いに行く', apart: 'すれ違い', breakup: '別れ', propose: 'プロポーズ', wedding: '結婚披露宴', baby: '子どもの誕生', move_out: '部屋を出る',
  caught: '見つかる', tempt: '誘惑', scoop: '週刊誌', tani_invite: 'タニマチの誘い', tani_leave: 'タニマチが離れる', school: '相撲教習所', class: '教習所の授業', graduate: '教習所の卒業',
  rival_yoko: '宿敵の横綱昇進', record: '優勝回数の記録', hono: '奉納土俵入り', yoko_warn: '横綱審議委員会', tsuna_advice: '綱取りの助言', retire_talk: '引退の相談', nisei_press: '二代目の取材', nisei_father: '二代目と父', nisei_pass: '二代目' };
const actLab = (ev, d) => { const t = String(d || ''), i = t.indexOf('/'), k = i < 0 ? t : t.slice(0, i), c = i < 0 ? '' : t.slice(i + 1), j = c.indexOf(':'), pick = !c ? '' : j < 0 ? '・選択' + c : '・「' + c.slice(j + 1) + '」';
  if (ev === 'life') { const [a, b] = k.split(':'); return (LIFE_LABEL[a] || a) + (b ? '（' + (LIFE_LABEL[b] || b) + '）' : '') + pick; }
  if (ev === 'kikyo') return '帰省「' + k + '」' + pick; if (ev === 'gacha') return 'ガチャ ' + k + '回引き'; if (ev === 'auto') return 'オートを使った'; if (ev === 'tut') return k === 'done' ? '遊び方の説明を最後まで見た' : '遊び方の説明を飛ばした（' + k.replace('skip:', '') + '枚目）'; return d; };
const EV_LABEL = { life: 'イベント', kikyo: '帰省', gacha: 'ガチャ', auto: 'オート', tut: '説明', land: '来た', open: '動いた', start: '入門', basho: '場所', promo: '昇進', retire: '引退', lang: '言語', share: 'シェア', err: 'エラー', reset: 'データ消去' };
/* 場所の記録「東幕下12枚目 5-2 優勝｜押A88 力B79 技A90 速S102 158kg」（古い記録は「幕下 5-2」だけ）を分ける */
const DIVS_J = ['前相撲', '序ノ口', '序二段', '三段目', '幕下', '十両', '前頭', '小結', '関脇', '大関', '横綱'];
const bp = d => { const [a, g] = String(d || '').split('｜'), m = a.match(/^(東|西)?(前相撲|序ノ口|序二段|三段目|幕下|十両|前頭|小結|関脇|大関|横綱)(\d+枚目)?\s*(.*)$/) || [];
  const gs = (g || '').split(' ').map(x => x.match(/^(押|力|技|速)([SABCDEF])(\d+)$/)).filter(Boolean).map(x => ({ k: x[1], g: x[2], v: +x[3] })), kg = ((g || '').match(/(\d+)kg/) || [])[1];
  return { div: m[2] || '', rank: m[2] ? (m[1] || '') + m[2] + (m[3] || '') : a, rec: m[4] || '', gs, kg }; };
const GRADE = v => [[100, 'S'], [85, 'A'], [70, 'B'], [55, 'C'], [40, 'D'], [25, 'E'], [0, 'F']].find(x => v >= x[0])[1];
const chips = (gs, kg) => gs.length ? `<span class="gs">${gs.map(x => `<span class="g ${x.g}" title="${x.v}">${x.k}${x.g}<small>${x.v}</small></span>`).join('')}${kg ? `<span class="kg">${kg}kg</span>` : ''}</span>` : '';
const bashoHtml = d => { const b = bp(d); return esc(b.rank + ' ' + b.rec) + (b.gs.length ? ' ' + chips(b.gs, b.kg) : ''); };
const PROMO = { juryo: '十両', makuuchi: '幕内', ozeki: '大関', yokozuna: '横綱' };
const jst = iso => { const t = new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString(); return t.slice(5, 7).replace(/^0/, '') + '/' + t.slice(8, 10).replace(/^0/, '') + ' ' + t.slice(11, 16); };
const HEAD = t => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><title>${t}</title>
<style>
:root{--bg:#f6f3ec;--card:#fffdf8;--fg:#1d1a16;--mut:#6f675a;--line:#e3dac8;--acc:#9a2b25;--gold:#b8862a;--bar:#d9b45a;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#10131f;--card:#181c2c;--fg:#f1ead8;--mut:#a59d8c;--line:#2c3248;--acc:#e2b04a;--gold:#e2b04a;--bar:#8a6a2a;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;-webkit-text-size-adjust:100%}
main{max-width:720px;margin:0 auto;padding:12px max(14px,env(safe-area-inset-right)) 40px max(14px,env(safe-area-inset-left));display:grid;gap:18px}
.top{position:sticky;top:0;z-index:2;background:var(--bg);padding:10px 0 8px;margin:-12px 0 0;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line)}
h1{font-size:18px;margin:0}.tabs{display:flex;gap:6px}.tabs a{padding:6px 12px;border:1px solid var(--line);border-radius:999px;color:var(--fg);text-decoration:none;font-size:14px;background:var(--card)}.tabs a.on{background:var(--acc);border-color:var(--acc);color:#fff}
.period{font-size:12.5px;color:var(--mut);margin:0}
.kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}@media (min-width:600px){.kpis{grid-template-columns:repeat(4,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;gap:2px}.kl{font-size:12.5px;color:var(--mut)}.kv{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}.kv small,.big small{font-size:13px;font-weight:600;margin-left:2px;color:var(--mut)}
h2{font-size:15px;margin:4px 0 -6px;color:var(--acc)}
.src{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;gap:8px}
.src header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.src h3{margin:0;font-size:16px;word-break:break-all}.lab{margin:0;font-size:12.5px;color:var(--mut)}
.big{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.1}
.sub{margin:0;font-size:12.5px;color:var(--mut)}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}@media (min-width:600px){.steps{grid-template-columns:repeat(7,1fr)}}
.steps li{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px;padding:5px 8px;display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px}
.steps li b{font-size:16px;font-variant-numeric:tabular-nums}.steps li i{position:absolute;left:0;bottom:0;height:3px;width:var(--w);background:var(--gold)}.steps li.z{opacity:.45}
.bars,.list,.log{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.bars li{display:grid;grid-template-columns:44px 1fr 32px;gap:8px;align-items:center;font-size:13px}.bars .bar{height:12px;background:var(--line);border-radius:6px;overflow:hidden}.bars .bar i{display:block;height:100%;width:var(--w);background:var(--bar)}
.bars b{text-align:right;font-variant-numeric:tabular-nums}.bars .t{grid-column:2/4;font-size:11.5px;color:var(--mut);margin-top:-4px;word-break:break-all}
.list li{display:flex;gap:10px;align-items:baseline;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:14px}.list li span{flex:1;min-width:0}.list small{color:var(--mut)}
.log li{display:grid;grid-template-columns:auto auto 1fr;gap:2px 10px;border-bottom:1px solid var(--line);padding:6px 0;font-size:13.5px}
.log .tm{color:var(--mut);font-variant-numeric:tabular-nums}.log .ev{font-weight:700}.log .dt{min-width:0;word-break:break-all}.log .who{grid-column:1/-1;font-size:11.5px;color:var(--mut)}
details summary{cursor:pointer;color:var(--acc);font-size:13.5px;padding:8px 0}
.acts summary{font-weight:700;color:var(--fg);font-size:14px}.acts .list{margin-bottom:6px}
.reload{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:5;display:flex;align-items:center;gap:6px;padding:12px 18px;border:0;border-radius:999px;background:var(--acc);color:#fff;font:700 15px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer}
.reload:focus-visible{outline:3px solid var(--fg);outline-offset:2px}.reload.busy{opacity:.7}
.updated{font-size:12px;color:var(--mut);margin:0}
.none{margin:0;color:var(--mut);font-size:13.5px;background:var(--card);border:1px dashed var(--line);border-radius:10px;padding:12px}
.views{display:flex;gap:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;width:max-content}.views a{padding:7px 16px;font-size:14px;color:var(--fg);text-decoration:none;background:var(--card)}.views a.on{background:var(--fg);color:var(--bg);font-weight:700}
.users{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.user{display:grid;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;color:var(--fg);text-decoration:none}
.user .uh{display:flex;justify-content:space-between;align-items:center;gap:8px}.user .id{font-weight:800;font-family:ui-monospace,monospace;font-size:15px}.user .srcl{font-size:12px;color:var(--mut)}
.chip{font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;white-space:nowrap;background:var(--line);color:var(--fg)}.chip.c2{background:#d9b45a;color:#2a2010}.chip.c3{background:#c0522d;color:#fff}.chip.c4{background:#7a1f1f;color:#fff}
.user .ln{font-size:12.5px;color:var(--mut);margin:0}.user .go{font-size:12.5px;color:var(--acc);text-align:right}
.back{font-size:14px;color:var(--acc);text-decoration:none}
.gs{display:inline-flex;gap:4px;flex-wrap:wrap;vertical-align:middle}.g{font:700 12px/1.2 ui-monospace,monospace;padding:2px 6px;border-radius:6px;background:var(--line);color:var(--fg)}.g small{font-weight:500;margin-left:2px;opacity:.8}
.g.S{background:#7a1f1f;color:#fff}.g.A{background:#c0522d;color:#fff}.g.B{background:#d9b45a;color:#2a2010}.kg{font-size:12px;color:var(--mut);align-self:center}
.rk li{grid-template-columns:52px 1fr 32px}.rk .t{display:flex;gap:4px;flex-wrap:wrap}
.daysep{font-size:12.5px;font-weight:700;color:var(--acc);margin:10px 0 0;border-bottom:1px solid var(--line);padding-bottom:2px}
</style></head><body><main>
`;
/* phone-first admin page: summary numbers, one card per source (people → how far they got → came back), daily bars, shares, recent log */
function page(d, key) {
  const k = encodeURIComponent(key), n = v => Number(v) || 0;
  const tabs = [7, 30, 90].map(x => `<a href="?key=${k}&days=${x}"${x === d.days ? ' class="on" aria-current="page"' : ''}>${x}日</a>`).join('');
  const by = (rows, f) => Object.fromEntries((rows || []).map(r => [r.src, r]));
  const F = by(d.funnel), R = by(d.retention), B = by(d.basho);
  const tot = { users: 0, fresh: 0, started: 0, shares: 0 };
  for (const s of d.sources) { tot.users += n(s.users); tot.fresh += n(s.new_users); }
  for (const f of d.funnel) tot.started += n(f.started);
  for (const s of d.shares) tot.shares += n(s.shares);
  const kpi = [['利用者', tot.users, '人'], ['新しく来た人', tot.fresh, '人'], ['入門した人', tot.started, '人'], ['シェア', tot.shares, '回']]
    .map(([l, v, u]) => `<div class="kpi"><span class="kl">${l}</span><span class="kv">${v}<small>${u}</small></span></div>`).join('');
  const steps = [['loaded', '動いた'], ['started', '入門'], ['played_basho', '場所'], ['juryo', '十両'], ['makuuchi', '幕内'], ['ozeki', '大関'], ['yokozuna', '横綱']];
  const cards = d.sources.length ? d.sources.map(s => {
    const f = F[s.src] || {}, r = R[s.src], b = B[s.src], base = n(f.users) || n(s.users);
    const st = steps.map(([c, l]) => { const v = n(f[c]); return `<li class="${v ? '' : 'z'}"><span>${l}</span><b>${v}</b><i style="--w:${base ? Math.round(v * 100 / base) : 0}%"></i></li>`; }).join('');
    const ret = r ? `<p class="sub">また来た　翌日 ${pct(n(r.came_next_day), n(r.eligible_next_day))}　7日以降 ${pct(n(r.came_after_7days), n(r.eligible_7days))}</p>` : '';
    const bs = b ? `<p class="sub">場所 ${n(b.basho)}回・1人あたり ${b.per_player}</p>` : '';
    const lab = srcLab(s.src);
    return `<article class="src"><header><div><h3>${esc(s.src)}</h3>${lab ? `<p class="lab">${esc(lab)}</p>` : ''}</div><div class="big">${n(s.users)}<small>人</small></div></header>
      <p class="sub">新しく来た ${n(s.new_users)}人・ゲームが動いた回数 ${n(s.opens)}回</p><ul class="steps">${st}</ul>${ret}${bs}</article>`;
  }).join('') : '<p class="none">まだ記録がありません。ゲームを開いた人がいると、ここに流入元ごとに出ます。</p>';
  const days = {}; for (const r of d.daily) { const x = days[r.day] || (days[r.day] = { n: 0, top: [] }); x.n += n(r.users); x.top.push(r.src + ' ' + r.users); }
  const dk = Object.keys(days).sort().reverse(), mx = Math.max(1, ...dk.map(x => days[x].n));
  const daily = dk.length ? `<ul class="bars">${dk.map(x => `<li><span class="d">${x.slice(5).replace('-', '/').replace(/^0/, '')}</span><span class="bar"><i style="--w:${Math.round(days[x].n * 100 / mx)}%"></i></span><b>${days[x].n}</b><span class="t">${esc(days[x].top.join('・'))}</span></li>`).join('')}</ul>` : '<p class="none">まだ記録がありません。</p>';
  const shares = d.shares.length ? `<ul class="list">${d.shares.map(s => `<li><span>${esc(shareLab(s.detail))}</span><b>${n(s.shares)}回</b><small>${n(s.users)}人</small></li>`).join('')}</ul>` : '<p class="none">まだシェアはありません。昇進・優勝・引退の画面の「この記録をシェアする」で数えます。</p>';
  const RK = {}; for (const r of d.ranks || []) { const b = bp(r.detail); if (!b.div) continue; const x = RK[b.div] || (RK[b.div] = { n: 0, sum: {}, c: {} }); x.n++;
    for (const g of b.gs) { x.sum[g.k] = (x.sum[g.k] || 0) + g.v; x.c[g.k] = (x.c[g.k] || 0) + 1; } }
  const rkMax = Math.max(1, ...Object.values(RK).map(x => x.n));
  const rankSec = Object.keys(RK).length ? `<p class="period">期間内に場所を終えた人の、最後の場所の地位。下は能力の平均（記録がある人だけ）。</p><ul class="bars rk">${DIVS_J.slice().reverse().filter(v => RK[v]).map(v => { const x = RK[v], gs = ['押', '力', '技', '速'].filter(k => x.c[k]).map(k => { const a = Math.round(x.sum[k] / x.c[k]); return { k, g: GRADE(a), v: a }; });
    return `<li><span class="d">${v}</span><span class="bar"><i style="--w:${Math.round(x.n * 100 / rkMax)}%"></i></span><b>${x.n}</b>${gs.length ? `<span class="t">${chips(gs)}</span>` : ''}</li>`; }).join('')}</ul>` : '<p class="none">まだ場所を終えた人がいません。</p>';
  const AG = { tut: '遊び方の説明', life: 'イベントと選んだ答え', kikyo: '帰省のイベント', gacha: 'ガチャ', auto: 'オート' };
  const acts = (d.acts || []).length ? ['tut', 'life', 'kikyo', 'gacha', 'auto'].filter(e => d.acts.some(a => a.ev === e)).map(e => `<details class="acts"${e === 'tut' || e === 'life' ? ' open' : ''}><summary>${AG[e]}（${d.acts.filter(a => a.ev === e).reduce((t, a) => t + n(a.n), 0)}回）</summary><ul class="list">${d.acts.filter(a => a.ev === e).slice(0, 30).map(a => `<li><span>${esc(actLab(a.ev, a.detail))}</span><b>${n(a.n)}回</b><small>${n(a.users)}人</small></li>`).join('')}</ul></details>`).join('') : '<p class="none">まだ記録がありません。イベントで選んだ答え、帰省、ガチャ、オート、遊び方の説明を数えます。</p>';
  const TYPE = { oshi: '押し相撲', yotsu: '四つ相撲', waza: '技能派' };
  const li = r => `<li><span class="tm">${jst(r.created_at)}</span><span class="ev">${EV_LABEL[r.ev] || esc(r.ev)}</span><span class="dt">${r.ev === 'basho' ? bashoHtml(r.detail) : esc(r.ev === 'promo' ? (PROMO[r.detail] || r.detail) : r.ev === 'share' ? shareLab(r.detail) : ['life', 'kikyo', 'gacha', 'auto', 'tut'].includes(r.ev) ? actLab(r.ev, r.detail) : r.ev === 'start' ? String(r.detail || '').split('/').map(x => TYPE[x] || x).join('・') : r.detail)}</span><span class="who">${esc(r.src)}・${esc(r.vid)}${r.lang && r.lang !== 'ja' ? '・' + esc(r.lang) : ''}</span></li>`;
  const recent = d.recent.length ? `<ul class="log">${d.recent.slice(0, 15).map(li).join('')}</ul>` + (d.recent.length > 15 ? `<details><summary>もっと見る（${d.recent.length - 15}件）</summary><ul class="log">${d.recent.slice(15).map(li).join('')}</ul></details>` : '') : '<p class="none">まだ記録がありません。</p>';
  return HEAD('横綱への道 利用状況') + `<div class="top"><h1>横綱への道 利用状況</h1><nav class="tabs" aria-label="期間">${tabs}</nav></div>
<nav class="views" aria-label="表示"><a class="on" aria-current="page">全体</a><a href="?key=${k}&days=${d.days}&view=users">ユーザー別</a></nav>
<p class="updated">${jst(new Date().toISOString())} 時点（日本時間）</p>
<button type="button" class="reload" id="reload" onclick="this.classList.add('busy');this.textContent='更新中…';location.reload()">↻ 更新</button>
<p class="period">${esc(d.since)} 〜 ${esc(d.until)}（日本時間）。人数は端末ごと（同じ人でもスマホとパソコンなら2人）。</p>
<section class="kpis" aria-label="期間の合計">${kpi}</section>
<h2>流入元ごと</h2>${cards}
<h2>いまの番付</h2>${rankSec}
<h2>日ごとの利用者</h2>${daily}
<h2>シェア</h2>${shares}
<h2>ゲーム内の出来事</h2>${acts}
<h2>最近の記録</h2>${recent}
<div style="height:64px"></div></main></body></html>`;
}

/* ---------- per-user views ---------- */
async function usersData(env, days) {
  const since = day(new Date(Date.now() - (days - 1) * 86400e3));
  const r = await env.DB.prepare(`SELECT vid, MIN(src) AS src, MIN(created_at) AS first, MAX(created_at) AS last, COUNT(*) AS n, COUNT(DISTINCT day) AS days,
      SUM(ev='open') AS opens, SUM(ev='start') AS starts, SUM(ev='basho') AS basho, SUM(ev='share') AS shares, SUM(ev IN ('life','kikyo')) AS evs,
      MAX(CASE WHEN ev='promo' THEN CASE detail WHEN 'yokozuna' THEN 4 WHEN 'ozeki' THEN 3 WHEN 'makuuchi' THEN 2 WHEN 'juryo' THEN 1 ELSE 0 END ELSE 0 END) AS promo,
      MAX(CASE WHEN ev='start' THEN detail END) AS startd, MAX(lang) AS lang,
      (SELECT e2.detail FROM events e2 WHERE e2.vid = e.vid AND e2.ev = 'basho' ORDER BY e2.id DESC LIMIT 1) AS lastBasho
    FROM events e WHERE vid IN (SELECT DISTINCT vid FROM events WHERE day >= ?1) GROUP BY vid ORDER BY last DESC LIMIT 300`).bind(since).all();
  return { since, until: day(), days, users: r.results || [] };
}
const TYPE_J = { oshi: '押し相撲', yotsu: '四つ相撲', waza: '技能派' };
const startLab = d => String(d || '').split('/').map(x => TYPE_J[x] || x).join('・');
const stage = u => Number(u.promo) >= 4 ? ['横綱', 'c4'] : Number(u.promo) === 3 ? ['大関', 'c4'] : Number(u.promo) === 2 ? ['幕内', 'c3'] : Number(u.promo) === 1 ? ['十両', 'c2']
  : Number(u.basho) > 0 ? ['場所を戦った', ''] : Number(u.starts) > 0 ? ['入門した', ''] : Number(u.opens) > 0 ? ['動いた', ''] : ['来ただけ', ''];
function usersPage(D, key) {
  const k = encodeURIComponent(key), n = v => Number(v) || 0;
  const tabs = [7, 30, 90].map(x => `<a href="?key=${k}&days=${x}&view=users"${x === D.days ? ' class="on" aria-current="page"' : ''}>${x}日</a>`).join('');
  const list = D.users.length ? `<ul class="users">${D.users.map(u => { const [sl, sc] = stage(u), lab = srcLab(u.src);
    return `<li><a class="user" href="?key=${k}&days=${D.days}&user=${encodeURIComponent(u.vid)}"><div class="uh"><span><span class="id">${esc(String(u.vid).slice(0, 6))}</span> <span class="srcl">${esc(u.src)}${lab ? '（' + esc(lab) + '）' : ''}</span></span><span class="chip ${sc}">${sl}</span></div>
      <p class="ln">初回 ${jst(u.first)}・最後 ${jst(u.last)}・来た日 ${n(u.days)}日</p>
      ${u.startd ? `<p class="ln">入門：${esc(startLab(u.startd))}</p>` : ''}
      ${u.lastBasho ? `<p class="ln">いまの番付 <b>${esc(bp(u.lastBasho).rank)}</b>（最後の場所 ${esc(bp(u.lastBasho).rec)}）</p>${bp(u.lastBasho).gs.length ? `<p class="ln">${chips(bp(u.lastBasho).gs, bp(u.lastBasho).kg)}</p>` : ''}` : ''}
      <p class="ln">場所 ${n(u.basho)}回・イベント ${n(u.evs)}回${n(u.shares) ? '・シェア ' + n(u.shares) + '回' : ''}${u.lang && u.lang !== 'ja' ? '・' + esc(u.lang) : ''}</p>
      <span class="go">記録を見る →</span></a></li>`; }).join('')}</ul>` : '<p class="none">この期間に来た人はまだいません。</p>';
  return HEAD('横綱への道 ユーザー別') + `<div class="top"><h1>横綱への道 利用状況</h1><nav class="tabs" aria-label="期間">${tabs}</nav></div>
<nav class="views" aria-label="表示"><a href="?key=${k}&days=${D.days}">全体</a><a class="on" aria-current="page">ユーザー別</a></nav>
<p class="updated">${jst(new Date().toISOString())} 時点（日本時間）・${D.users.length}人（新しく動いた順）</p>
<button type="button" class="reload" onclick="this.classList.add('busy');this.textContent='更新中…';location.reload()">↻ 更新</button>
<p class="period">${esc(D.since)} 〜 ${esc(D.until)} に来た人。番号は端末ごとのランダムな番号の先頭6文字です。</p>
${list}<div style="height:64px"></div></main></body></html>`;
}
async function userPage(env, vid, key, days) {
  const k = encodeURIComponent(key), r = await env.DB.prepare('SELECT created_at, src, ev, detail, lang FROM events WHERE vid = ?1 ORDER BY id DESC LIMIT 2000').bind(vid).all(), rows = r.results || [];
  const u = { promo: 0, basho: 0, starts: 0, opens: 0 };
  for (const x of rows) { if (x.ev === 'basho') u.basho++; if (x.ev === 'start') { u.starts++; u.startd = u.startd || x.detail; } if (x.ev === 'open') u.opens++; if (x.ev === 'promo') u.promo = Math.max(u.promo, { juryo: 1, makuuchi: 2, ozeki: 3, yokozuna: 4 }[x.detail] || 0); }
  const [sl, sc] = stage(u), src = rows.length ? rows[rows.length - 1].src : '', lab = srcLab(src);
  let lastDay = '', items = '';
  for (const x of rows) { const dd = jst(x.created_at).split(' ')[0]; if (dd !== lastDay) { if (items) items += '</ul>'; items += `<p class="daysep">${dd}</p><ul class="log">`; lastDay = dd; }
    const det = x.ev === 'promo' ? (PROMO[x.detail] || x.detail) : x.ev === 'share' ? shareLab(x.detail) : ['life', 'kikyo', 'gacha', 'auto', 'tut'].includes(x.ev) ? actLab(x.ev, x.detail) : x.ev === 'start' ? startLab(x.detail) : x.detail;
    items += `<li><span class="tm">${jst(x.created_at).split(' ')[1]}</span><span class="ev">${EV_LABEL[x.ev] || esc(x.ev)}</span><span class="dt">${x.ev === 'basho' ? bashoHtml(x.detail) : esc(det)}</span></li>`; }
  if (items) items += '</ul>';
  return HEAD('横綱への道 ' + esc(String(vid).slice(0, 6))) + `<div class="top"><h1>端末 ${esc(String(vid).slice(0, 6))}</h1><a class="back" href="?key=${k}&days=${days}&view=users">← ユーザー別へ</a></div>
<button type="button" class="reload" onclick="this.classList.add('busy');this.textContent='更新中…';location.reload()">↻ 更新</button>
<article class="src"><header><div><h3>${esc(src)}</h3>${lab ? `<p class="lab">${esc(lab)}</p>` : ''}</div><span class="chip ${sc}">${sl}</span></header>
<p class="sub">記録 ${rows.length}件・場所 ${u.basho}回${u.startd ? '・入門：' + esc(startLab(u.startd)) : ''}</p>
${rows.length ? `<p class="sub">初回 ${jst(rows[rows.length - 1].created_at)}・最後 ${jst(rows[0].created_at)}（日本時間）</p>` : ''}</article>
<h2>記録（新しい順）</h2>${items || '<p class="none">記録がありません。</p>'}<div style="height:64px"></div></main></body></html>`;
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
      const H = { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } };
      if (url.pathname === '/admin' && url.searchParams.get('user')) return new Response(await userPage(env, url.searchParams.get('user').slice(0, 40), key, days), H);
      if (url.pathname === '/admin' && url.searchParams.get('view') === 'users') return new Response(usersPage(await usersData(env, days), key), H);
      const d = await stats(env, days);
      if (url.pathname === '/stats') return Response.json(d);
      return new Response(page(d, key), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    return new Response('not found', { status: 404 });
  },
};
