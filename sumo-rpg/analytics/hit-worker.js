/* yokozuna-hit: counts visits that arrive with ?from=<source> on yokozuna-sumo.pages.dev.
   The game page sends one beacon per visit:  POST /hit  body {"from":"kokoshinro","path":"/"}
   - never stores the raw IP: visitor_hash = SHA-256(SALT|JST date|IP|User-Agent), so the same person counts once per day
   - the D1 write runs in ctx.waitUntil, the response (204) goes back at once
   - GET /stats?days=7&key=<STATS_KEY> returns visits and unique visitors per day and source (JSON)
   Bindings: DB (D1 yokozuna-analytics). Secrets: VISITOR_SALT, STATS_KEY. */
const ALLOWED_ORIGINS = ['https://yokozuna-sumo.pages.dev'];
const SRC_RE = /^[a-z0-9_-]{1,32}$/;

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.yokozuna-sumo\.pages\.dev$/.test(origin || '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
}
const jstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url), origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (url.pathname === '/hit' && request.method === 'POST') {
      if (origin && !cors(origin)['Access-Control-Allow-Origin']) return new Response(null, { status: 204 }); // only count our own pages
      let body = {};
      try { body = JSON.parse((await request.text()).slice(0, 2000) || '{}'); } catch (e) {}
      const raw = String(body.from || '').toLowerCase().trim();
      const from = SRC_RE.test(raw) ? raw : 'other';
      const path = String(body.path || '/').slice(0, 100);
      const now = new Date(), date = jstDate(now);
      const ip = request.headers.get('CF-Connecting-IP') || '';
      const ua = (request.headers.get('User-Agent') || '').slice(0, 300);
      ctx.waitUntil((async () => {
        try {
          const hash = await sha256hex([env.VISITOR_SALT || 'change-me', date, ip, ua].join('|'));
          await env.DB.prepare('INSERT INTO visits (from_source, path, visited_at, visit_date, visitor_hash) VALUES (?1, ?2, ?3, ?4, ?5)')
            .bind(from, path, now.toISOString(), date, hash).run();
        } catch (e) { console.log('hit failed', e && e.message); }
      })());
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      if (!env.STATS_KEY || url.searchParams.get('key') !== env.STATS_KEY) return new Response('forbidden', { status: 403 });
      const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10) || 7));
      const since = jstDate(new Date(Date.now() - (days - 1) * 86400e3));
      const { results } = await env.DB.prepare(
        'SELECT visit_date, from_source, COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS unique_visitors FROM visits WHERE visit_date >= ?1 GROUP BY visit_date, from_source ORDER BY visit_date DESC, visits DESC'
      ).bind(since).all();
      const { results: total } = await env.DB.prepare(
        'SELECT from_source, COUNT(*) AS visits, COUNT(DISTINCT visit_date || visitor_hash) AS unique_visitor_days FROM visits WHERE visit_date >= ?1 GROUP BY from_source ORDER BY visits DESC'
      ).bind(since).all();
      return Response.json({ since, days, total, daily: results });
    }
    return new Response('not found', { status: 404 });
  },
};
