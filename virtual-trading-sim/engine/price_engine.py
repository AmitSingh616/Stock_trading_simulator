import logging

from services.market_service import update_all_prices, log_price_history
from engine.order_executor import execute_pending_orders
from services.snapshot_service import take_all_snapshots

logger = logging.getLogger(__name__)


def run_price_cycle() -> None:
    """
    Full market cycle — called by APScheduler every 20 seconds.

    Step 1 — Update stock prices (volatility-based random walk)
    Step 2 — Insert into stock_prices_history
    Step 3 — Check pending_orders against new prices
    Step 4 — Execute triggered orders (inserts into transactions;
              MySQL triggers update balance + portfolio)
    Step 5 — Record portfolio_snapshots for all users
    """
    logger.info("=== Price cycle START ===")

    try:
        # Step 1 + 2: update prices, capture (stock_id, new_price) pairs
        stock_updates = update_all_prices()
        logger.info("Step 1 | Prices updated for %d stocks", len(stock_updates))

        log_price_history(stock_updates)
        logger.info("Step 2 | Price history logged")

        # Step 3 + 4: order execution
        executed, cancelled = execute_pending_orders(stock_updates)
        logger.info(
            "Steps 3-4 | Orders → executed=%d  cancelled=%d", executed, cancelled
        )

        # Step 5: snapshots
        snapped = take_all_snapshots()
        logger.info("Step 5 | Portfolio snapshots recorded for %d users", snapped)

    except Exception as exc:  # noqa: BLE001
        logger.error("Price cycle ERROR: %s", exc, exc_info=True)

    logger.info("=== Price cycle END ===")
