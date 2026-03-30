import logging

import mysql.connector

from models.pending_order_model import get_pending_orders_for_stocks, update_order_status
from models.transaction_model import insert_transaction

logger = logging.getLogger(__name__)


def execute_pending_orders(
    stock_updates: list[tuple[int, float]],
) -> tuple[int, int]:
    """
    Called after every price cycle with the freshly computed prices.

    Logic per order type:
      LIMIT_BUY   → execute BUY  when current_price <= trigger_price
      STOP_LOSS   → execute SELL when current_price <= trigger_price
      TAKE_PROFIT → execute SELL when current_price >= trigger_price

    Execution = insert into transactions (MySQL trigger handles balance + portfolio).
    If the trigger raises (insufficient funds / shares) → mark CANCELLED.

    Returns: (executed_count, cancelled_count)
    """
    if not stock_updates:
        return 0, 0

    # Build a fast lookup: stock_id → new price
    price_map: dict[int, float] = {sid: price for sid, price in stock_updates}
    stock_ids = list(price_map.keys())

    orders = get_pending_orders_for_stocks(stock_ids)
    if not orders:
        return 0, 0

    executed = 0
    cancelled = 0

    for order in orders:
        stock_id = order["stock_id"]
        current_price = price_map.get(stock_id)
        if current_price is None:
            continue

        order_type = order["order_type"]
        trigger_price = float(order["trigger_price"])

        # ---------------------------------------------------------
        # Determine if this order should fire at the current price
        # ---------------------------------------------------------
        should_fire = False
        if order_type == "LIMIT_BUY" and current_price <= trigger_price:
            should_fire = True
        elif order_type == "STOP_LOSS" and current_price <= trigger_price:
            should_fire = True
        elif order_type == "TAKE_PROFIT" and current_price >= trigger_price:
            should_fire = True

        if not should_fire:
            continue

        # ---------------------------------------------------------
        # Execute: insert transaction at current_price
        # Trigger enforces balance / shares — may raise
        # ---------------------------------------------------------
        trade_type = "BUY" if order_type == "LIMIT_BUY" else "SELL"
        quantity = order["quantity"]
        total_amount = round(current_price * quantity, 2)

        try:
            insert_transaction(
                order["user_id"],
                stock_id,
                trade_type,
                quantity,
                current_price,
                total_amount,
            )
            update_order_status(order["id"], "EXECUTED")
            executed += 1
            logger.info(
                "Order %s EXECUTED | type=%s qty=%s @ %.2f",
                order["id"], order_type, quantity, current_price,
            )

        except mysql.connector.Error as exc:
            # Trigger SIGNAL = insufficient balance or shares
            update_order_status(order["id"], "CANCELLED")
            cancelled += 1
            logger.warning(
                "Order %s CANCELLED | type=%s reason=%s",
                order["id"], order_type, exc.msg,
            )

        except Exception as exc:  # noqa: BLE001
            logger.error("Unexpected error executing order %s: %s", order["id"], exc)

    return executed, cancelled
