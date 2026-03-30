from extensions import get_connection


def insert_snapshot(user_id: int, total_value: float, snapshot_date: str) -> None:
    """Record a portfolio value snapshot. One row per cycle — full history retained."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO portfolio_snapshots (user_id, total_value, snapshot_date) "
            "VALUES (%s, %s, %s)",
            (user_id, total_value, snapshot_date),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_user_snapshots(user_id: int, limit: int = 90) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT total_value, snapshot_date
            FROM portfolio_snapshots
            WHERE user_id = %s
            ORDER BY snapshot_date DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
