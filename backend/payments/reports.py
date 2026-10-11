from datetime import date, timedelta
from decimal import Decimal

from db_access import fetch_all, fetch_one
from rest_framework.exceptions import ValidationError

DEFAULT_DAYS = 30
MAX_DAYS = 366


def _parse_day(raw, name):
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({name: "Use the format YYYY-MM-DD."})


def date_range(params):
    """Inclusive range from ?from= and ?to=; defaults to the last 30 days, Kampala time."""
    raw_from, raw_to = params.get("from"), params.get("to")
    today = fetch_one("SELECT (NOW() AT TIME ZONE 'Africa/Kampala')::date AS today")[
        "today"
    ]
    end = _parse_day(raw_to, "to") if raw_to else today
    start = (
        _parse_day(raw_from, "from")
        if raw_from
        else end - timedelta(days=DEFAULT_DAYS - 1)
    )
    if start > end:
        raise ValidationError({"from": "'from' must be on or before 'to'."})
    if (end - start).days + 1 > MAX_DAYS:
        raise ValidationError({"from": f"Range can't be longer than {MAX_DAYS} days."})
    return start, end


def daily_sales(start, end):
    """One row per day, including days with no sales, so charts have no gaps."""
    rows = fetch_all(
        """SELECT d::date AS sale_date,
                  COUNT(sr.sales_record_id) AS orders,
                  COALESCE(SUM(sr.total_amount), 0) AS revenue
             FROM generate_series(%s::timestamp, %s::timestamp, interval '1 day') AS d
             LEFT JOIN sales_record sr ON sr.sale_date = d::date
            GROUP BY d
            ORDER BY d""",
        (start, end),
    )
    orders = sum(r["orders"] for r in rows)
    revenue = sum((r["revenue"] for r in rows), Decimal(0))
    average = (revenue / orders).quantize(Decimal("0.01")) if orders else Decimal(0)
    return rows, {"orders": orders, "revenue": revenue, "avg_order_value": average}


def top_items(start, end, limit):
    return fetch_all(
        """SELECT mi.menu_item_id, mi.item_name,
                  SUM(oi.quantity) AS units_sold,
                  SUM(oi.item_subtotal) AS revenue
             FROM sales_record sr
             JOIN order_items oi ON oi.order_id = sr.order_id
             JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
            WHERE sr.sale_date BETWEEN %s AND %s
            GROUP BY mi.menu_item_id, mi.item_name
            ORDER BY units_sold DESC, revenue DESC, mi.item_name
            LIMIT %s""",
        (start, end, limit),
    )


def waiter_performance(start, end):
    """Every wait staff member, including ones with no sales in the range."""
    return fetch_all(
        """SELECT s.staff_id, s.username,
                  COUNT(sr.sales_record_id) AS orders_handled,
                  COALESCE(SUM(sr.total_amount), 0) AS revenue,
                  COALESCE(ROUND(AVG(sr.total_amount), 2), 0) AS avg_order_value
             FROM staff s
             LEFT JOIN orders o ON o.staff_id = s.staff_id
             LEFT JOIN sales_record sr
                    ON sr.order_id = o.order_id AND sr.sale_date BETWEEN %s AND %s
            WHERE s.role = 'wait_staff'
            GROUP BY s.staff_id, s.username
            ORDER BY revenue DESC, s.username""",
        (start, end),
    )


def table_turnover(start, end):
    """parties_served = different customer sessions that paid at the table.
    turnover_per_day = parties_served / days in range."""
    days = (end - start).days + 1
    rows = fetch_all(
        """SELECT t.table_id,
                  COUNT(sr.sales_record_id) AS orders_paid,
                  COUNT(DISTINCT o.customer_id)
                      FILTER (WHERE sr.sales_record_id IS NOT NULL) AS parties_served,
                  COALESCE(SUM(sr.total_amount), 0) AS revenue
             FROM tables t
             LEFT JOIN orders o ON o.table_id = t.table_id
             LEFT JOIN sales_record sr
                    ON sr.order_id = o.order_id AND sr.sale_date BETWEEN %s AND %s
            GROUP BY t.table_id
            ORDER BY t.table_id""",
        (start, end),
    )
    for row in rows:
        row["turnover_per_day"] = round(row["parties_served"] / days, 2)
    return rows


def payment_methods(start, end):
    """Both methods always appear, even with zero payments."""
    return fetch_all(
        """SELECT m.method AS payment_method,
                  COUNT(x.sales_record_id) AS payments,
                  COALESCE(SUM(x.amount), 0) AS revenue
             FROM (VALUES ('Cash'), ('Mobile Money')) AS m(method)
             LEFT JOIN (
                  SELECT p.payment_method, p.amount, sr.sales_record_id
                    FROM payments p
                    JOIN sales_record sr ON sr.payment_id = p.payment_id
                   WHERE sr.sale_date BETWEEN %s AND %s
                  ) x ON x.payment_method = m.method
            GROUP BY m.method
            ORDER BY revenue DESC, m.method""",
        (start, end),
    )
