-- Refresh non-menu demonstration data on a dedicated development database.
-- Menu rows are required and are deliberately preserved exactly as they are.
-- This script replaces tables, staff, customers, orders, order items, payments,
-- and sales records with a randomized restaurant history through the current day.
-- Sample staff accounts use the development-only password `DemoPass123!`.
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM menu_items) THEN
        RAISE EXCEPTION 'Seed menu_items before refreshing demonstration data';
    END IF;
END;
$$;

-- Clear every dependent demo table, but never truncate or update menu_items.
TRUNCATE TABLE sales_record, payments, order_items, orders, customers, tables, staff
RESTART IDENTITY;

INSERT INTO tables (table_id, free_status)
SELECT n, TRUE
  FROM generate_series(1, 20) AS n;

INSERT INTO staff
    (staff_id, password, username, first_name, last_name, email, is_staff,
     is_active, date_joined, role)
VALUES
    (1,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_amina',     'Amina',     'Namusoke',   'demo_01@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-01 08:00:00+03', 'cashier'),
    (2,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_brian',     'Brian',     'Kato',       'demo_02@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-02 08:00:00+03', 'cashier'),
    (3,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_claire',    'Claire',    'Atim',       'demo_03@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-03 08:00:00+03', 'cashier'),
    (4,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_daniel',    'Daniel',    'Okello',     'demo_04@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-04 08:00:00+03', 'cashier'),
    (5,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_esther',    'Esther',    'Nankya',     'demo_05@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-05 08:00:00+03', 'cashier'),
    (6,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_faridah',   'Faridah',   'Mugisha',    'demo_06@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-06 08:00:00+03', 'wait_staff'),
    (7,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_grace',     'Grace',     'Achieng',    'demo_07@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-07 08:00:00+03', 'wait_staff'),
    (8,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_henry',     'Henry',     'Ssemanda',   'demo_08@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-08 08:00:00+03', 'wait_staff'),
    (9,  'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_irene',     'Irene',     'Nabwire',    'demo_09@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-09 08:00:00+03', 'wait_staff'),
    (10, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_joseph',    'Joseph',    'Tumusiime',  'demo_10@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-10 08:00:00+03', 'wait_staff'),
    (11, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_kevin',     'Kevin',     'Ocen',       'demo_11@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-11 08:00:00+03', 'kitchen'),
    (12, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_lydia',     'Lydia',     'Nansubuga',  'demo_12@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-12 08:00:00+03', 'kitchen'),
    (13, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_moses',     'Moses',     'Kakooza',    'demo_13@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-13 08:00:00+03', 'kitchen'),
    (14, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_nabirye',   'Nabirye',   'Akello',     'demo_14@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-14 08:00:00+03', 'kitchen'),
    (15, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_oliver',    'Oliver',    'Muwanga',    'demo_15@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-15 08:00:00+03', 'kitchen'),
    (16, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_patricia',  'Patricia',  'Kiconco',    'demo_16@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-16 08:00:00+03', 'manager'),
    (17, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_richard',   'Richard',   'Wasswa',     'demo_17@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-17 08:00:00+03', 'manager'),
    (18, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_sarah',     'Sarah',     'Nakato',     'demo_18@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-18 08:00:00+03', 'manager'),
    (19, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_timothy',   'Timothy',   'Bukenya',    'demo_19@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-19 08:00:00+03', 'manager'),
    (20, 'pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_violet',    'Violet',    'Nambasa',    'demo_20@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-20 08:00:00+03', 'manager');

-- Three guest sessions per day for 60 days, with random table assignments.
INSERT INTO customers (customer_id, table_id, session_token, created_at)
SELECT n,
       1 + floor(random() * 20)::INTEGER,
       gen_random_uuid()::TEXT,
       (CURRENT_TIMESTAMP - ((n - 1) % 60) * INTERVAL '1 day'
          - random() * INTERVAL '4 hours')
  FROM generate_series(1, 180) AS n;

-- Recent orders cover every workflow state; older activity is mostly completed.
-- The first six orders guarantee one row in each valid order state.
WITH generated AS (
    SELECT n,
           c.table_id,
           c.created_at + random() * LEAST(INTERVAL '8 hours', CURRENT_TIMESTAMP - c.created_at) AS order_time,
           CASE
               WHEN n <= 6 THEN (ARRAY['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'])[n]
               WHEN n > 60 AND random() < 0.10 THEN 'cancelled'
               WHEN n > 60 THEN 'served'
               WHEN random() < 0.12 THEN 'cancelled'
               WHEN random() < 0.22 THEN 'pending'
               WHEN random() < 0.42 THEN 'confirmed'
               WHEN random() < 0.65 THEN 'preparing'
               WHEN random() < 0.82 THEN 'ready'
               ELSE 'served'
           END AS order_status,
           6 + floor(random() * 5)::INTEGER AS staff_id
      FROM generate_series(1, 180) AS n
      JOIN customers c ON c.customer_id = n
)
INSERT INTO orders (order_id, customer_id, table_id, staff_id, order_status, order_time)
SELECT n, n, table_id, staff_id, order_status, order_time
  FROM generated;

-- One to four randomly selected existing menu items per order.
INSERT INTO order_items (order_id, menu_item_id, quantity, special_instructions)
SELECT o.order_id,
       mi.menu_item_id,
       1 + floor(random() * 4)::INTEGER,
       (ARRAY[NULL, NULL, 'No chilli', 'Sauce on the side', 'Pack for takeaway', 'Extra sauce'])[1 + floor(random() * 6)::INTEGER]
  FROM orders o
  CROSS JOIN LATERAL (
      SELECT 1 + floor(random() * 4 + (o.order_id % 4) * 0.000001)::INTEGER AS line_count
  ) item_count
  CROSS JOIN LATERAL generate_series(1, item_count.line_count) AS line_no
  CROSS JOIN LATERAL (
      SELECT m.menu_item_id
        FROM menu_items m
       ORDER BY random() * o.order_id
       LIMIT 1
  ) AS mi;

-- Most served orders are paid, with both supported methods and times after service.
-- Payment triggers also create sales records from the recorded item totals.
INSERT INTO payments (order_id, amount, payment_method, cashier_id, transaction_time)
SELECT o.order_id,
       totals.order_total,
       CASE WHEN random() < 0.58 THEN 'Cash' ELSE 'Mobile Money' END,
       1 + floor(random() * 5)::INTEGER,
       o.order_time + random() * LEAST(INTERVAL '2 hours', CURRENT_TIMESTAMP - o.order_time)
  FROM orders o
  JOIN LATERAL (
      SELECT SUM(oi.item_subtotal) AS order_total
        FROM order_items oi
       WHERE oi.order_id = o.order_id
  ) totals ON TRUE
 WHERE o.order_status = 'served'
   AND (o.order_time < CURRENT_TIMESTAMP - INTERVAL '1 day' OR random() < 0.85);

-- Repair the derived table availability after the randomized order/payment load.
UPDATE tables t
   SET free_status = NOT EXISTS (
       SELECT 1
         FROM orders o
        WHERE o.table_id = t.table_id
          AND o.order_status <> 'cancelled'
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id)
   );

SELECT setval(pg_get_serial_sequence('tables', 'table_id'), (SELECT MAX(table_id) FROM tables), TRUE);
SELECT setval(pg_get_serial_sequence('staff', 'staff_id'), (SELECT MAX(staff_id) FROM staff), TRUE);
SELECT setval(pg_get_serial_sequence('customers', 'customer_id'), (SELECT MAX(customer_id) FROM customers), TRUE);
SELECT setval(pg_get_serial_sequence('orders', 'order_id'), (SELECT MAX(order_id) FROM orders), TRUE);
SELECT setval(pg_get_serial_sequence('order_items', 'order_item_id'), (SELECT MAX(order_item_id) FROM order_items), TRUE);
SELECT setval(pg_get_serial_sequence('payments', 'payment_id'), (SELECT MAX(payment_id) FROM payments), TRUE);
SELECT setval(pg_get_serial_sequence('sales_record', 'sales_record_id'), (SELECT MAX(sales_record_id) FROM sales_record), TRUE);

COMMIT;
