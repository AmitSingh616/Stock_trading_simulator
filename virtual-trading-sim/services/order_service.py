from models.stock_model import get_stock_by_symbol
from models.pending_order_model import (
    create_pending_order,
    get_user_pending_orders,
    cancel_order_by_user,
)
from utils.constants import VALID_ORDER_TYPES


def create_order(
    user_id: int, data: dict
) -> tuple[dict | None, str | None, int]:
    """
    Place a new pending order (LIMIT_BUY, STOP_LOSS, TAKE_PROFIT).
    Funds are NOT reserved at this point — checked at execution time.
    """
    symbol = str(data.get("symbol", "")).upper().strip()
    order_type = str(data.get("order_type", "")).upper().strip()
    trigger_price = data.get("trigger_price")
    quantity = data.get("quantity")

    if not all([symbol, order_type, trigger_price is not None, quantity is not None]):
        return None, "symbol, order_type, trigger_price, and quantity are required", 400

    if order_type not in VALID_ORDER_TYPES:
        return None, f"order_type must be one of: {sorted(VALID_ORDER_TYPES)}", 400

    try:
        trigger_price = float(trigger_price)
        quantity = int(quantity)
        if quantity <= 0:
            raise ValueError("quantity must be positive")
        if trigger_price <= 0:
            raise ValueError("trigger_price must be positive")
    except (ValueError, TypeError) as exc:
        return None, str(exc), 400

    stock = get_stock_by_symbol(symbol)
    if not stock:
        return None, f"Stock '{symbol}' not found", 404

    order_id = create_pending_order(
        user_id, stock["id"], order_type, trigger_price, quantity
    )

    return (
        {
            "message": "Pending order placed successfully",
            "order_id": order_id,
            "symbol": symbol,
            "order_type": order_type,
            "trigger_price": trigger_price,
            "quantity": quantity,
        },
        None,
        201,
    )


def get_orders(user_id: int) -> list[dict]:
    return get_user_pending_orders(user_id)


def cancel_order(
    order_id: int, user_id: int
) -> tuple[dict | None, str | None, int]:
    cancelled = cancel_order_by_user(order_id, user_id)
    if not cancelled:
        return None, "Order not found or already processed", 404
    return {"message": "Order cancelled successfully", "order_id": order_id}, None, 200
