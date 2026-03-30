import logging

from flask import Flask

from config import Config
from extensions import init_pool
from routes.auth_routes import auth_bp
from routes.stock_routes import stock_bp
from routes.trading_routes import trading_bp
from routes.order_routes import order_bp
from routes.portfolio_routes import portfolio_bp
from routes.watchlist_routes import watchlist_bp
from routes.analytics_routes import analytics_bp
from scheduler.scheduler import start_scheduler
from flask_cors import CORS

# ---------------------------------------------------------------------------
# Logging — visible in the console when running locally
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
    # -----------------------------------------------------------------------
    # Database connection pool
    # Must be initialised before any request or scheduler job runs.
    # -----------------------------------------------------------------------
    init_pool(app.config)

    # -----------------------------------------------------------------------
    # Blueprints
    #
    # portfolio_bp is mounted at /api (not /api/portfolio) so that:
    #   GET /api/transactions    matches the spec directly
    #   GET /api/portfolio
    #   GET /api/portfolio/history
    # -----------------------------------------------------------------------
    app.register_blueprint(auth_bp,       url_prefix="/api/auth")
    app.register_blueprint(stock_bp,      url_prefix="/api/stocks")
    app.register_blueprint(trading_bp,    url_prefix="/api/trading")
    app.register_blueprint(order_bp,      url_prefix="/api/orders")
    app.register_blueprint(portfolio_bp,  url_prefix="/api")
    app.register_blueprint(watchlist_bp,  url_prefix="/api/watchlist")
    app.register_blueprint(analytics_bp,  url_prefix="/api/analytics")

    # -----------------------------------------------------------------------
    # Health-check — useful during development
    # -----------------------------------------------------------------------
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app = create_app()

    # Start the price engine scheduler AFTER the pool is ready.
    # use_reloader=False is required — the reloader forks a child process
    # which would start a second scheduler instance.
    start_scheduler()

    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
