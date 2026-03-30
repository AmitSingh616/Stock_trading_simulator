from extensions import get_connection


def get_all_stocks() -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM stocks ORDER BY symbol")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_stock_by_symbol(symbol: str) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM stocks WHERE symbol = %s", (symbol,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def get_stock_by_id(stock_id: int) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM stocks WHERE id = %s", (stock_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def get_stock_history(stock_id: int, limit: int = 100) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT price, recorded_at FROM stock_prices_history "
            "WHERE stock_id = %s ORDER BY recorded_at DESC LIMIT %s",
            (stock_id, limit),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_all_stocks_with_prices() -> list[dict]:
    """Fetch id, current_price, volatility_tier for the price engine."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, current_price, volatility_tier FROM stocks")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def bulk_update_prices(updates: list[tuple]) -> None:
    """
    Batch-update current_price for all stocks.
    updates: list of (new_price, stock_id)
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.executemany(
            "UPDATE stocks SET current_price = %s WHERE id = %s", updates
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
