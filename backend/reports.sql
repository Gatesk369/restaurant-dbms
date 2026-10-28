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


-- ---------------------------------------------------------------------------
-- Query 2: Top-selling menu items
--
-- Purpose: rank the menu items by how many units were sold, with the revenue
--          each one brought in.
-- Tables:  SALES_RECORD (keeps only paid orders and gives the sale date),
--          ORDER_ITEMS (quantity and item_subtotal of every line),
--          MENU_ITEMS (item_name).
-- Output:  menu_item_id | item_name | units_sold | revenue
--          units_sold is SUM(quantity); revenue is SUM(item_subtotal), the
--          price x quantity worked out by the order_items trigger. Ties on
--          units are broken by revenue, then by name. The app shows the top
--          six (LIMIT 6).
-- ---------------------------------------------------------------------------
SELECT mi.menu_item_id, mi.item_name,
       SUM(oi.quantity) AS units_sold,
       SUM(oi.item_subtotal) AS revenue
  FROM sales_record sr
  JOIN order_items oi ON oi.order_id = sr.order_id
  JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
 WHERE sr.sale_date BETWEEN :'from' AND :'to'
 GROUP BY mi.menu_item_id, mi.item_name
 ORDER BY units_sold DESC, revenue DESC, mi.item_name
 LIMIT 6;
