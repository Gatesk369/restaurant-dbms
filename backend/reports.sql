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


-- ---------------------------------------------------------------------------
-- Query 3: Waiter performance
--
-- Purpose: how many paid orders each waiter handled and how much revenue
--          those orders brought in.
-- Tables:  STAFF (the waiters: role = 'wait_staff'),
--          ORDERS (staff_id links an order to the waiter assigned to it),
--          SALES_RECORD (paid orders in the range and their total_amount).
-- Output:  staff_id | username | orders_handled | revenue | avg_order_value
--          Every waiter is listed, including those with no sales in the range
--          (0 orders, 0 revenue), because STAFF is the left side of LEFT
--          JOINs. The date filter sits in the JOIN condition, not in WHERE,
--          so it does not drop those waiters. Highest revenue first.
-- ---------------------------------------------------------------------------
SELECT s.staff_id, s.username,
       COUNT(sr.sales_record_id) AS orders_handled,
       COALESCE(SUM(sr.total_amount), 0) AS revenue,
       COALESCE(ROUND(AVG(sr.total_amount), 2), 0) AS avg_order_value
  FROM staff s
  LEFT JOIN orders o ON o.staff_id = s.staff_id
  LEFT JOIN sales_record sr
         ON sr.order_id = o.order_id AND sr.sale_date BETWEEN :'from' AND :'to'
 WHERE s.role = 'wait_staff'
 GROUP BY s.staff_id, s.username
 ORDER BY revenue DESC, s.username;
