import mysql.connector
from mysql.connector import pooling

_pool: pooling.MySQLConnectionPool | None = None


def init_pool(config: dict) -> None:
    """
    Initialise the MySQL connection pool once at startup.
    config is the Flask app.config dict.
    """
    global _pool
    if _pool is not None:
        return  # already initialised

    _pool = pooling.MySQLConnectionPool(
        pool_name="trading_pool",
        pool_size=config["DB_POOL_SIZE"],
        host=config["DB_HOST"],
        port=config["DB_PORT"],
        user=config["DB_USER"],
        password=config["DB_PASSWORD"],
        database=config["DB_NAME"],
        autocommit=False,
        connection_timeout=10,
    )


def get_connection() -> mysql.connector.MySQLConnection:
    """
    Borrow a connection from the pool.
    Caller is responsible for calling conn.close() to return it.
    Works in Flask routes AND background scheduler threads.
    """
    if _pool is None:
        raise RuntimeError("Connection pool not initialised — call init_pool() first.")
    return _pool.get_connection()
