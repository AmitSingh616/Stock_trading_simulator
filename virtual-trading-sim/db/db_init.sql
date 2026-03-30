-- =============================================================================
-- Virtual Stock Trading Simulation System
-- Schema: db_init.sql
-- Run this file once to set up the database from scratch.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS virtual_trading
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE virtual_trading;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              INT            NOT NULL AUTO_INCREMENT,
    username        VARCHAR(50)    NOT NULL,
    email           VARCHAR(100)   NOT NULL,
    password_hash   VARCHAR(255)   NOT NULL,
    virtual_balance DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email    (email)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- stocks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stocks (
    id              INT            NOT NULL AUTO_INCREMENT,
    symbol          VARCHAR(10)    NOT NULL,
    company_name    VARCHAR(100)   NOT NULL,
    current_price   DECIMAL(10, 2) NOT NULL,
    volatility_tier ENUM('STABLE','NORMAL','VOLATILE') NOT NULL DEFAULT 'NORMAL',
    PRIMARY KEY (id),
    UNIQUE KEY uq_stocks_symbol (symbol)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- stock_prices_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_prices_history (
    id          INT            NOT NULL AUTO_INCREMENT,
    stock_id    INT            NOT NULL,
    price       DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_sph_stock FOREIGN KEY (stock_id)
        REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- transactions
-- NOTE: balance and portfolio updates happen via AFTER INSERT trigger —
--       never update them directly in application code.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id                   INT            NOT NULL AUTO_INCREMENT,
    user_id              INT            NOT NULL,
    stock_id             INT            NOT NULL,
    type                 ENUM('BUY','SELL') NOT NULL,
    quantity             INT            NOT NULL,
    price_at_transaction DECIMAL(10, 2) NOT NULL,
    total_amount         DECIMAL(15, 2) NOT NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_txn_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_txn_stock FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- portfolios
-- Managed exclusively by triggers — never write to this table from Python.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolios (
    user_id            INT            NOT NULL,
    stock_id           INT            NOT NULL,
    quantity_held      INT            NOT NULL DEFAULT 0,
    avg_purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (user_id, stock_id),
    CONSTRAINT fk_port_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_port_stock FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- pending_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_orders (
    id            INT            NOT NULL AUTO_INCREMENT,
    user_id       INT            NOT NULL,
    stock_id      INT            NOT NULL,
    order_type    ENUM('LIMIT_BUY','STOP_LOSS','TAKE_PROFIT') NOT NULL,
    trigger_price DECIMAL(10, 2) NOT NULL,
    quantity      INT            NOT NULL,
    status        ENUM('PENDING','EXECUTED','CANCELLED')      NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_po_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_po_stock FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- watchlists
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlists (
    user_id  INT NOT NULL,
    stock_id INT NOT NULL,
    PRIMARY KEY (user_id, stock_id),
    CONSTRAINT fk_wl_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE,
    CONSTRAINT fk_wl_stock FOREIGN KEY (stock_id) REFERENCES stocks (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- portfolio_snapshots
-- One row inserted per user per price cycle (every 20 s).
-- Full history is retained for charting.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id            INT            NOT NULL AUTO_INCREMENT,
    user_id       INT            NOT NULL,
    total_value   DECIMAL(15, 2) NOT NULL,
    snapshot_date TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_snap_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Indexes (per architecture spec)
-- =============================================================================
CREATE INDEX idx_transactions_user_id        ON transactions       (user_id);
CREATE INDEX idx_pending_orders_stock_status ON pending_orders     (stock_id, status);
CREATE INDEX idx_portfolios_user_id          ON portfolios         (user_id);
CREATE INDEX idx_sph_stock_id               ON stock_prices_history (stock_id);
CREATE INDEX idx_snapshots_user_id          ON portfolio_snapshots  (user_id);
