-- PostgreSQL demonstration data for the Restaurant DBMS schema.
-- Run once after `python manage.py init_sql_schema` against a dedicated empty development database.
-- All sample staff accounts use the development-only password `DemoPass123!`.
BEGIN;

-- 20 dining tables
INSERT INTO tables (table_id, free_status) VALUES
(1001, TRUE),
(1002, TRUE),
(1003, TRUE),
(1004, TRUE),
(1005, TRUE),
(1006, TRUE),
(1007, TRUE),
(1008, TRUE),
(1009, TRUE),
(1010, TRUE),
(1011, TRUE),
(1012, TRUE),
(1013, TRUE),
(1014, TRUE),
(1015, TRUE),
(1016, TRUE),
(1017, TRUE),
(1018, TRUE),
(1019, TRUE),
(1020, TRUE);

-- 20 guest sessions, each associated with a real dining table
INSERT INTO customers (customer_id, table_id, session_token, created_at) VALUES
(1001, 1001, '80e4018b-28d3-52d8-97a5-141c23bab141', TIMESTAMPTZ '2026-10-02 10:00:00+00'),
(1002, 1002, '87c6f35b-8666-5f04-a74f-524f5d78ca7d', TIMESTAMPTZ '2026-10-02 11:00:00+00'),
(1003, 1003, '648c271d-c12f-5d99-a7cb-2b096f49699f', TIMESTAMPTZ '2026-10-03 12:00:00+00'),
(1004, 1004, '8c55dfeb-d652-5a17-99f5-772041847678', TIMESTAMPTZ '2026-10-03 10:00:00+00'),
(1005, 1005, 'c7891e72-47c9-5ac8-9382-054ada751ba4', TIMESTAMPTZ '2026-10-04 11:00:00+00'),
(1006, 1006, '3e8cba2c-0205-5a6e-a698-533384566b89', TIMESTAMPTZ '2026-10-04 12:00:00+00'),
(1007, 1007, '87d3cc88-2a52-5013-8913-ce65090d0654', TIMESTAMPTZ '2026-10-05 10:00:00+00'),
(1008, 1008, '1a201386-2d98-5ad1-8ffa-99ad1fbc0120', TIMESTAMPTZ '2026-10-05 11:00:00+00'),
(1009, 1009, 'e71d6559-36cb-50b5-9392-6f6ad57ca95b', TIMESTAMPTZ '2026-10-06 12:00:00+00'),
(1010, 1010, '704e5a41-9752-5c7e-9473-9ead42c4271e', TIMESTAMPTZ '2026-10-06 10:00:00+00'),
(1011, 1011, 'e8c085b9-f5c8-5520-9264-f94dd5900536', TIMESTAMPTZ '2026-10-07 11:00:00+00'),
(1012, 1012, '7bd60cac-551c-5167-9718-cdcdcb9e1c3c', TIMESTAMPTZ '2026-10-07 12:00:00+00'),
(1013, 1013, '601a16e3-ee32-54fb-8a4f-fe25269b5941', TIMESTAMPTZ '2026-10-08 10:00:00+00'),
(1014, 1014, '1a11a923-8220-54c4-ae07-c4427ed46cd5', TIMESTAMPTZ '2026-10-08 11:00:00+00'),
(1015, 1015, 'dc4e4d61-c4d1-5ccb-be89-5bdf4100d58b', TIMESTAMPTZ '2026-10-09 12:00:00+00'),
(1016, 1016, '782d5fe2-e630-5fd6-a0b0-87610743ca95', TIMESTAMPTZ '2026-10-09 10:00:00+00'),
(1017, 1017, '7ff1fdbb-6afc-52ba-9e4d-ae72d07616d4', TIMESTAMPTZ '2026-10-09 11:00:00+00'),
(1018, 1018, '8e6b3c8c-fdb7-57af-9f3a-a1f8fa006a2b', TIMESTAMPTZ '2026-10-09 12:00:00+00'),
(1019, 1019, '9db8accc-c334-5def-80ff-5f4caaf63ca8', TIMESTAMPTZ '2026-10-09 10:00:00+00'),
(1020, 1020, '8a089c64-a97f-51ea-966f-96399fdfc64d', TIMESTAMPTZ '2026-10-09 11:00:00+00');

-- 20 staff accounts across cashier, wait staff, kitchen, and manager roles.
INSERT INTO staff (password, username, first_name, last_name, email, is_staff, is_active, date_joined, staff_id, role) VALUES
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_amina', 'Amina', 'Namusoke', 'demo_01@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-01 08:00:00+00', 1001, 'cashier'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_brian', 'Brian', 'Kato', 'demo_02@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-02 08:00:00+00', 1002, 'cashier'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_claire', 'Claire', 'Atim', 'demo_03@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-03 08:00:00+00', 1003, 'cashier'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_daniel', 'Daniel', 'Okello', 'demo_04@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-04 08:00:00+00', 1004, 'cashier'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_esther', 'Esther', 'Nankya', 'demo_05@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-05 08:00:00+00', 1005, 'cashier'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_faridah', 'Faridah', 'Mugisha', 'demo_06@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-06 08:00:00+00', 1006, 'wait_staff'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_grace', 'Grace', 'Achieng', 'demo_07@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-07 08:00:00+00', 1007, 'wait_staff'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_henry', 'Henry', 'Ssemanda', 'demo_08@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-08 08:00:00+00', 1008, 'wait_staff'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_irene', 'Irene', 'Nabwire', 'demo_09@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-09 08:00:00+00', 1009, 'wait_staff'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_joseph', 'Joseph', 'Tumusiime', 'demo_10@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-10 08:00:00+00', 1010, 'wait_staff'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_kevin', 'Kevin', 'Ocen', 'demo_11@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-11 08:00:00+00', 1011, 'kitchen'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_lydia', 'Lydia', 'Nansubuga', 'demo_12@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-12 08:00:00+00', 1012, 'kitchen'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_moses', 'Moses', 'Kakooza', 'demo_13@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-13 08:00:00+00', 1013, 'kitchen'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_nabirye', 'Nabirye', 'Akello', 'demo_14@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-14 08:00:00+00', 1014, 'kitchen'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_oliver', 'Oliver', 'Muwanga', 'demo_15@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-15 08:00:00+00', 1015, 'kitchen'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_patricia', 'Patricia', 'Kiconco', 'demo_16@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-16 08:00:00+00', 1016, 'manager'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_richard', 'Richard', 'Wasswa', 'demo_17@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-17 08:00:00+00', 1017, 'manager'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_sarah', 'Sarah', 'Nakato', 'demo_18@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-18 08:00:00+00', 1018, 'manager'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_timothy', 'Timothy', 'Bukenya', 'demo_19@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-19 08:00:00+00', 1019, 'manager'),
('pbkdf2_sha256$1000000$fhWCSWbNZPqcre9hZRIxcE$ZyjBcfSt0wiy3AQpv+c52y80y6zMO1J3uhGhxBlP3UQ=', 'demo_violet', 'Violet', 'Nambasa', 'demo_20@restaurant.test', FALSE, TRUE, TIMESTAMPTZ '2026-09-20 08:00:00+00', 1020, 'manager');

-- 20 menu items with positive UGX prices
INSERT INTO menu_items (menu_item_id, item_name, description, price, availability_status) VALUES
(1001, 'Rolex', 'Chapati rolled with eggs and vegetables', 8000.00, TRUE),
(1002, 'Chicken Rolex', 'Chapati rolled with eggs and grilled chicken', 12000.00, TRUE),
(1003, 'Beef Samosa', 'Crisp pastry filled with seasoned beef', 4000.00, TRUE),
(1004, 'Vegetable Samosa', 'Crisp pastry filled with vegetables', 3500.00, TRUE),
(1005, 'Chicken Luwombo', 'Steamed chicken in banana leaves with groundnut sauce', 28000.00, TRUE),
(1006, 'Beef Luwombo', 'Slow-cooked beef with groundnut sauce', 26000.00, TRUE),
(1007, 'Grilled Tilapia', 'Whole grilled tilapia with lemon and herbs', 35000.00, TRUE),
(1008, 'Matooke and Groundnut Sauce', 'Steamed matooke with groundnut sauce', 14000.00, TRUE),
(1009, 'Beef Stew and Rice', 'Beef stew served with steamed rice', 18000.00, TRUE),
(1010, 'Chicken Pilau', 'Spiced rice with chicken', 22000.00, TRUE),
(1011, 'Vegetable Pilau', 'Spiced rice with seasonal vegetables', 15000.00, TRUE),
(1012, 'Chips and Chicken', 'Chips served with grilled chicken', 20000.00, TRUE),
(1013, 'Chapati', 'Freshly made East African flatbread', 3000.00, TRUE),
(1014, 'Katogo', 'Matooke cooked with beans and vegetables', 12000.00, TRUE),
(1015, 'Fresh Passion Juice', 'Fresh passion fruit juice', 7000.00, TRUE),
(1016, 'Fresh Mango Juice', 'Fresh mango juice', 7000.00, TRUE),
(1017, 'Soda', 'Assorted bottled soft drink', 4000.00, TRUE),
(1018, 'Mineral Water', 'Bottled mineral water', 3000.00, TRUE),
(1019, 'Black Tea', 'Ugandan black tea', 4000.00, TRUE),
(1020, 'African Coffee', 'Locally brewed coffee', 6000.00, TRUE);

-- 20 served orders across the 20 customers and tables.
-- The schema trigger marks each table occupied until payment is recorded.
INSERT INTO orders (order_id, customer_id, table_id, staff_id, order_status, order_time) VALUES
(1001, 1001, 1001, 1006, 'served', TIMESTAMPTZ '2026-10-02 11:00:00+00'),
(1002, 1002, 1002, 1007, 'served', TIMESTAMPTZ '2026-10-02 12:07:00+00'),
(1003, 1003, 1003, 1008, 'served', TIMESTAMPTZ '2026-10-03 13:14:00+00'),
(1004, 1004, 1004, 1009, 'served', TIMESTAMPTZ '2026-10-03 14:21:00+00'),
(1005, 1005, 1005, 1010, 'served', TIMESTAMPTZ '2026-10-04 15:28:00+00'),
(1006, 1006, 1006, 1006, 'served', TIMESTAMPTZ '2026-10-04 16:35:00+00'),
(1007, 1007, 1007, 1007, 'served', TIMESTAMPTZ '2026-10-05 17:42:00+00'),
(1008, 1008, 1008, 1008, 'served', TIMESTAMPTZ '2026-10-05 18:49:00+00'),
(1009, 1009, 1009, 1009, 'served', TIMESTAMPTZ '2026-10-06 19:56:00+00'),
(1010, 1010, 1010, 1010, 'served', TIMESTAMPTZ '2026-10-06 11:03:00+00'),
(1011, 1011, 1011, 1006, 'served', TIMESTAMPTZ '2026-10-07 12:10:00+00'),
(1012, 1012, 1012, 1007, 'served', TIMESTAMPTZ '2026-10-07 13:17:00+00'),
(1013, 1013, 1013, 1008, 'served', TIMESTAMPTZ '2026-10-08 14:24:00+00'),
(1014, 1014, 1014, 1009, 'served', TIMESTAMPTZ '2026-10-08 15:31:00+00'),
(1015, 1015, 1015, 1010, 'served', TIMESTAMPTZ '2026-10-09 16:38:00+00'),
(1016, 1016, 1016, 1006, 'served', TIMESTAMPTZ '2026-10-09 17:45:00+00'),
(1017, 1017, 1017, 1007, 'served', TIMESTAMPTZ '2026-10-09 18:52:00+00'),
(1018, 1018, 1018, 1008, 'served', TIMESTAMPTZ '2026-10-09 19:59:00+00'),
(1019, 1019, 1019, 1009, 'served', TIMESTAMPTZ '2026-10-09 11:06:00+00'),
(1020, 1020, 1020, 1010, 'served', TIMESTAMPTZ '2026-10-09 12:13:00+00');

-- One menu line per order; the database trigger computes item_subtotal.
INSERT INTO order_items (order_item_id, order_id, menu_item_id, quantity, special_instructions) VALUES
(1001, 1001, 1001, 2, NULL),
(1002, 1002, 1002, 1, 'No chilli'),
(1003, 1003, 1003, 3, NULL),
(1004, 1004, 1004, 2, 'Pack for takeaway'),
(1005, 1005, 1005, 1, 'Mild spice'),
(1006, 1006, 1006, 2, NULL),
(1007, 1007, 1007, 1, 'Serve with extra lemon'),
(1008, 1008, 1008, 3, NULL),
(1009, 1009, 1009, 2, 'Sauce on the side'),
(1010, 1010, 1010, 1, NULL),
(1011, 1011, 1011, 2, 'No onions'),
(1012, 1012, 1012, 1, NULL),
(1013, 1013, 1013, 4, NULL),
(1014, 1014, 1014, 2, 'Extra groundnut sauce'),
(1015, 1015, 1015, 2, NULL),
(1016, 1016, 1016, 1, 'No added sugar'),
(1017, 1017, 1017, 3, NULL),
(1018, 1018, 1018, 2, NULL),
(1019, 1019, 1019, 1, 'Tea with little milk'),
(1020, 1020, 1020, 2, NULL);

-- 20 completed payments; the database trigger creates one sales_record per payment.
-- Payment amounts match their order item subtotals.
INSERT INTO payments (payment_id, order_id, amount, payment_method, cashier_id, transaction_time) VALUES
(1001, 1001, 16000.00, 'Cash', 1001, TIMESTAMPTZ '2026-10-02 13:00:00+00'),
(1002, 1002, 12000.00, 'Mobile Money', 1002, TIMESTAMPTZ '2026-10-02 14:07:00+00'),
(1003, 1003, 12000.00, 'Mobile Money', 1003, TIMESTAMPTZ '2026-10-03 15:14:00+00'),
(1004, 1004, 7000.00, 'Cash', 1004, TIMESTAMPTZ '2026-10-03 16:21:00+00'),
(1005, 1005, 28000.00, 'Mobile Money', 1005, TIMESTAMPTZ '2026-10-04 17:28:00+00'),
(1006, 1006, 52000.00, 'Cash', 1001, TIMESTAMPTZ '2026-10-04 18:35:00+00'),
(1007, 1007, 35000.00, 'Mobile Money', 1002, TIMESTAMPTZ '2026-10-05 19:42:00+00'),
(1008, 1008, 42000.00, 'Mobile Money', 1003, TIMESTAMPTZ '2026-10-05 20:49:00+00'),
(1009, 1009, 36000.00, 'Cash', 1004, TIMESTAMPTZ '2026-10-06 21:56:00+00'),
(1010, 1010, 22000.00, 'Mobile Money', 1005, TIMESTAMPTZ '2026-10-06 13:03:00+00'),
(1011, 1011, 30000.00, 'Cash', 1001, TIMESTAMPTZ '2026-10-07 14:10:00+00'),
(1012, 1012, 20000.00, 'Mobile Money', 1002, TIMESTAMPTZ '2026-10-07 15:17:00+00'),
(1013, 1013, 12000.00, 'Mobile Money', 1003, TIMESTAMPTZ '2026-10-08 16:24:00+00'),
(1014, 1014, 24000.00, 'Cash', 1004, TIMESTAMPTZ '2026-10-08 17:31:00+00'),
(1015, 1015, 14000.00, 'Mobile Money', 1005, TIMESTAMPTZ '2026-10-09 18:38:00+00'),
(1016, 1016, 7000.00, 'Cash', 1001, TIMESTAMPTZ '2026-10-09 19:45:00+00'),
(1017, 1017, 12000.00, 'Mobile Money', 1002, TIMESTAMPTZ '2026-10-09 20:52:00+00'),
(1018, 1018, 6000.00, 'Mobile Money', 1003, TIMESTAMPTZ '2026-10-09 21:59:00+00'),
(1019, 1019, 4000.00, 'Cash', 1004, TIMESTAMPTZ '2026-10-09 13:06:00+00'),
(1020, 1020, 12000.00, 'Mobile Money', 1005, TIMESTAMPTZ '2026-10-09 14:13:00+00');

-- The payment trigger inserts the matching 20 sales_record rows and frees paid tables.
-- Advance identity sequences after supplying explicit IDs so later application inserts do not collide.
SELECT setval(pg_get_serial_sequence('tables', 'table_id'), (SELECT MAX(table_id) FROM tables));
SELECT setval(pg_get_serial_sequence('customers', 'customer_id'), (SELECT MAX(customer_id) FROM customers));
SELECT setval(pg_get_serial_sequence('staff', 'staff_id'), (SELECT MAX(staff_id) FROM staff));
SELECT setval(pg_get_serial_sequence('menu_items', 'menu_item_id'), (SELECT MAX(menu_item_id) FROM menu_items));
SELECT setval(pg_get_serial_sequence('orders', 'order_id'), (SELECT MAX(order_id) FROM orders));
SELECT setval(pg_get_serial_sequence('order_items', 'order_item_id'), (SELECT MAX(order_item_id) FROM order_items));
SELECT setval(pg_get_serial_sequence('payments', 'payment_id'), (SELECT MAX(payment_id) FROM payments));
COMMIT;
