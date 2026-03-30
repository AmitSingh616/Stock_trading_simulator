import random

from extensions import get_connection
from models.stock_model import get_all_stocks_with_prices, bulk_update_prices
from utils.constants import VOLATILITY_RANGES, MIN_STOCK_PRICE


def _generate_new_price(current_price: float, volatility_tier: str) -> float:
    max_swing = VOLATILITY_RANGES.get(volatility_tier, VOLATILITY_RANGES["NORMAL"])
    change_pct = random.uniform(-max_swing, max_swing)
    new_price = round(float(current_price) * (1 + change_pct), 2)
    return max(new_price, MIN_STOCK_PRICE)


def update_all_prices() -> list[tuple[int, float]]:
    """
    1. Fetch current prices + volatility tiers for every stock.
    2. Compute new prices.
    3. Batch-update the stocks table.

    Returns: list of (stock_id, new_price) — passed to the history logger
             and order executor.
    """
    stocks = get_all_stocks_with_prices()
    if not stocks:
        return []

    stock_updates: list[tuple[int, float]] = []
    for stock in stocks:
        new_price = _generate_new_price(stock["current_price"], stock["volatility_tier"])
        stock_updates.append((stock["id"], new_price))

    # bulk_update_prices expects (new_price, stock_id) for the SET clause
    bulk_update_prices([(price, sid) for sid, price in stock_updates])

    return stock_updates  # [(stock_id, new_price), ...]


def log_price_history(stock_updates: list[tuple[int, float]]) -> None:
    """Insert one history row per stock per cycle."""
    if not stock_updates:
        return
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO stock_prices_history (stock_id, price) VALUES (%s, %s)",
            stock_updates,
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
