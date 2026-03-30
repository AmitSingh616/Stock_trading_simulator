import atexit
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from engine.price_engine import run_price_cycle

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    """
    Start the APScheduler background scheduler.

    Safe to call once from app.py — guarded against double-start
    (important when use_reloader=False is forgotten).

    The scheduler runs in a daemon thread so it does NOT block Flask.
    atexit ensures a clean shutdown when the process exits.
    """
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.warning("Scheduler already running — skipping start.")
        return

    _scheduler = BackgroundScheduler(
        job_defaults={
            "coalesce": True,        # if a run is missed, fire once (not many)
            "max_instances": 1,      # never overlap two price cycles
            "misfire_grace_time": 5, # tolerate up to 5 s of latency
        }
    )

    _scheduler.add_job(
        func=run_price_cycle,
        trigger=IntervalTrigger(seconds=20),
        id="price_engine",
        name="Virtual Trading — Price Engine",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("APScheduler started — price engine firing every 20 seconds.")

    # Graceful shutdown when the Python process exits
    atexit.register(_shutdown_scheduler)


def _shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down.")
