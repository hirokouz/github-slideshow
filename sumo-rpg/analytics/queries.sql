-- Past 7 days (JST), per source: visits and unique visitors (same person counts once per day)
SELECT from_source,
       COUNT(*)                                   AS visits,
       COUNT(DISTINCT visit_date || visitor_hash) AS unique_visitor_days
FROM visits
WHERE visit_date >= date('now', '+9 hours', '-6 days')
GROUP BY from_source
ORDER BY visits DESC;

-- Per day and source, past 7 days
SELECT visit_date, from_source, COUNT(*) AS visits, COUNT(DISTINCT visitor_hash) AS unique_visitors
FROM visits
WHERE visit_date >= date('now', '+9 hours', '-6 days')
GROUP BY visit_date, from_source
ORDER BY visit_date DESC, visits DESC;

-- Any period: replace the dates
SELECT from_source, COUNT(*) AS visits, COUNT(DISTINCT visit_date || visitor_hash) AS unique_visitor_days
FROM visits WHERE visit_date BETWEEN '2026-11-01' AND '2026-11-30'
GROUP BY from_source ORDER BY visits DESC;
