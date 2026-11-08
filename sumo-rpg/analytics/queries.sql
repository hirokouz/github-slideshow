-- 過去7日（日本時間）：流入元ごとの人数と、開いた回数
SELECT src, COUNT(DISTINCT vid) AS users, SUM(ev='open') AS opens
FROM events WHERE day >= date('now','+9 hours','-6 days')
GROUP BY src ORDER BY users DESC;

-- 過去7日：流入元ごと・日ごとの人数
SELECT day, src, COUNT(DISTINCT vid) AS users
FROM events WHERE day >= date('now','+9 hours','-6 days')
GROUP BY day, src ORDER BY day DESC, users DESC;

-- どこまで進んだか（流入元ごと、全期間）
SELECT src,
  COUNT(DISTINCT vid) AS users,
  COUNT(DISTINCT CASE WHEN ev='start' THEN vid END) AS started,
  COUNT(DISTINCT CASE WHEN ev='promo' AND detail='juryo' THEN vid END) AS juryo,
  COUNT(DISTINCT CASE WHEN ev='promo' AND detail='makuuchi' THEN vid END) AS makuuchi,
  COUNT(DISTINCT CASE WHEN ev='promo' AND detail='ozeki' THEN vid END) AS ozeki,
  COUNT(DISTINCT CASE WHEN ev='promo' AND detail='yokozuna' THEN vid END) AS yokozuna
FROM events GROUP BY src ORDER BY users DESC;
