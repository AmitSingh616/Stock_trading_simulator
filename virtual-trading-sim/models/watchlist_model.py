from extensions import get_connection


def add_to_watchlist(user_id: int, stock_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT IGNORE INTO watchlists (user_id, stock_id) VALUES (%s, %s)",
            (user_id, stock_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()


def remove_from_watchlist(user_id: int, stock_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM watchlists WHERE user_id = %s AND stock_id = %s",
            (user_id, stock_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()


def get_watchlist(user_id: int) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT s.id, s.symbol, s.company_name, s.current_price, s.volatility_tier
            FROM watchlists w
            JOIN stocks s ON w.stock_id = s.id
            WHERE w.user_id = %s
            ORDER BY s.symbol
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
