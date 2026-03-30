from extensions import get_connection


def create_pending_order(
    user_id: int,
    stock_id: int,
    order_type: str,
    trigger_price: float,
    quantity: int,
) -> int:
    """Insert a new pending order and return its ID."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO pending_orders
                (user_id, stock_id, order_type, trigger_price, quantity, status)
            VALUES (%s, %s, %s, %s, %s, 'PENDING')
            """,
            (user_id, stock_id, order_type, trigger_price, quantity),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        conn.close()


def get_user_pending_orders(user_id: int) -> list[dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT po.id, po.order_type, po.trigger_price, po.quantity,
                   po.status, po.created_at,
                   s.symbol, s.company_name, s.current_price
            FROM pending_orders po
            JOIN stocks s ON po.stock_id = s.id
            WHERE po.user_id = %s AND po.status = 'PENDING'
            ORDER BY po.created_at DESC
            """,
            (user_id,),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def get_pending_orders_for_stocks(stock_ids: list[int]) -> list[dict]:
    """
    Fetch all PENDING orders for a set of stock IDs.
    Called by the order executor after each price cycle.
    """
    if not stock_ids:
        return []
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        placeholders = ", ".join(["%s"] * len(stock_ids))
        cursor.execute(
            f"SELECT * FROM pending_orders "
            f"WHERE stock_id IN ({placeholders}) AND status = 'PENDING'",
            stock_ids,
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def update_order_status(order_id: int, status: str) -> None:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE pending_orders SET status = %s WHERE id = %s",
            (status, order_id),
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def cancel_order_by_user(order_id: int, user_id: int) -> bool:
    """Cancel an order only if it belongs to user and is still PENDING."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE pending_orders
            SET status = 'CANCELLED'
            WHERE id = %s AND user_id = %s AND status = 'PENDING'
            """,
            (order_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
