from extensions import get_connection


def insert_transaction(
    user_id: int,
    stock_id: int,
    trans_type: str,
    quantity: int,
    price_at_transaction: float,
    total_amount: float,
) -> int:
    """
    Insert a single trade record into transactions.

    IMPORTANT: Do NOT update user balance or portfolios here.
    MySQL BEFORE/AFTER INSERT triggers handle:
      - BEFORE: validate sufficient balance (BUY) or shares (SELL)
      - AFTER:  update virtual_balance, portfolios, avg_purchase_price

    Raises mysql.connector.Error if the trigger SIGNAL fires
    (insufficient funds or shares).

    Returns the new transaction ID.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO transactions
                (user_id, stock_id, type, quantity, price_at_transaction, total_amount)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, stock_id, trans_type, quantity, price_at_transaction, total_amount),
        )
        conn.commit()
        return cursor.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def get_user_transactions(
    user_id: int,
    stock_id: int | None = None,
    trans_type: str | None = None,
    limit: int = 50,
) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT t.id, t.type, t.quantity, t.price_at_transaction,
                   t.total_amount, t.created_at,
                   s.symbol, s.company_name
            FROM transactions t
            JOIN stocks s ON t.stock_id = s.id
            WHERE t.user_id = %s
        """
        params: list = [user_id]

        if stock_id is not None:
            query += " AND t.stock_id = %s"
            params.append(stock_id)

        if trans_type is not None:
            query += " AND t.type = %s"
            params.append(trans_type)

        query += " ORDER BY t.created_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
