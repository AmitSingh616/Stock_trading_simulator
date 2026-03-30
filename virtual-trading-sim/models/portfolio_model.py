from extensions import get_connection


def get_user_portfolio(user_id: int) -> list[dict]:
    """
    Return all holdings for a user, enriched with live stock data
    and computed PnL metrics.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                p.stock_id,
                p.quantity_held,
                p.avg_purchase_price,
                s.symbol,
                s.company_name,
                s.current_price,
                ROUND(p.quantity_held * s.current_price, 2)           AS current_value,
                ROUND(p.quantity_held * p.avg_purchase_price, 2)       AS cost_basis,
                ROUND(
                    (s.current_price - p.avg_purchase_price)
                    / p.avg_purchase_price * 100, 2
                )                                                       AS pnl_percent
            FROM portfolios p
            JOIN stocks s ON p.stock_id = s.id
            WHERE p.user_id = %s
            ORDER BY s.symbol
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_portfolio_item(user_id: int, stock_id: int) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM portfolios WHERE user_id = %s AND stock_id = %s",
            (user_id, stock_id),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()
