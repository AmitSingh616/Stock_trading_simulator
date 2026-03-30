import logging
from datetime import datetime, timezone

from extensions import get_connection
from models.snapshot_model import insert_snapshot

logger = logging.getLogger(__name__)


def take_all_snapshots() -> int:
    """
    Compute each user's total portfolio value (cash + market value of holdings)
    and insert one snapshot row per user.

    Uses a single aggregation query to avoid N+1 DB round-trips.
    Returns the number of snapshots recorded.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                u.id                                                        AS user_id,
                u.virtual_balance,
                COALESCE(SUM(p.quantity_held * s.current_price), 0)        AS stock_value
            FROM users u
            LEFT JOIN portfolios p ON u.id = p.user_id
            LEFT JOIN stocks    s ON p.stock_id = s.id
            GROUP BY u.id, u.virtual_balance
            """
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    snapshot_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    count = 0

    for row in rows:
        total_value = round(float(row["virtual_balance"]) + float(row["stock_value"]), 2)
        try:
            insert_snapshot(row["user_id"], total_value, snapshot_date)
            count += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("Snapshot failed for user %s: %s", row["user_id"], exc)

    return count
