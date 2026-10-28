-- Restaurant DBMS: analytical report queries.
--
-- These are the same queries the manager report endpoints run in
-- payments/reports.py (GET /api/staff/reports/...), written out on their own
-- so they can be read and run directly. The Python code passes the dates as
-- %s parameters; here they are psql variables.
--
-- Every report covers an inclusive date range and counts completed sales
-- only: a row in SALES_RECORD exists once an order has been paid (the
-- payments_after_insert trigger creates it), so unpaid and cancelled orders
-- never appear in the figures.
--
-- Run against a database loaded with schema.sql and seed.sql:
--
--   psql "$DATABASE_URL" -v from=2026-10-01 -v to=2026-10-29 -f reports.sql


-- ---------------------------------------------------------------------------
-- Query 1: Daily sales
--
-- Purpose: total revenue and number of paid orders for every day in the
--          range, so the manager can see the sales trend.
-- Tables:  SALES_RECORD (one row per paid order: sale_date, total_amount).
-- Output:  sale_date | orders | revenue
--          One row per calendar day, including days with no sales (orders 0,
--          revenue 0): generate_series builds the list of days and the LEFT
--          JOIN keeps the empty ones, so the chart has no gaps.
-- ---------------------------------------------------------------------------
SELECT d::date AS sale_date,
       COUNT(sr.sales_record_id) AS orders,
       COALESCE(SUM(sr.total_amount), 0) AS revenue
  FROM generate_series(:'from'::timestamp, :'to'::timestamp, interval '1 day') AS d
  LEFT JOIN sales_record sr ON sr.sale_date = d::date
 GROUP BY d
 ORDER BY d;
