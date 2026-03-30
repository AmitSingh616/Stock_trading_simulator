-- =============================================================================
-- Virtual Stock Trading Simulation System
-- Triggers: triggers.sql
--
-- Architecture rules enforced here:
--   Rule 1 — balance updates happen only in this file, never in Python
--   Rule 2 — portfolio updates happen only in this file, never in Python
--   Rule 3 — every trade (manual + automated) flows through transactions
--
-- Load order: run db_init.sql first, then this file.
-- =============================================================================

USE virtual_trading;

DELIMITER $$

-- =============================================================================
-- TRIGGER 1: before_transaction_insert
-- Purpose : Validate the trade BEFORE the row is committed.
--           SIGNAL aborts the INSERT and rolls back — Python catches the error.
-- =============================================================================

DROP TRIGGER IF EXISTS before_transaction_insert$$

CREATE TRIGGER before_transaction_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_balance      DECIMAL(15, 2);
    DECLARE v_shares_held  INT;

    -- ------------------------------------------------------------------
    -- BUY validation: user must have enough virtual_balance
    -- ------------------------------------------------------------------
    IF NEW.type = 'BUY' THEN

        SELECT virtual_balance
          INTO v_balance
          FROM users
         WHERE id = NEW.user_id;

        IF v_balance < NEW.total_amount THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Insufficient balance for this purchase';
        END IF;

    END IF;

    -- ------------------------------------------------------------------
    -- SELL validation: user must hold enough shares
    -- ------------------------------------------------------------------
    IF NEW.type = 'SELL' THEN

        SELECT COALESCE(quantity_held, 0)
          INTO v_shares_held
          FROM portfolios
         WHERE user_id = NEW.user_id
           AND stock_id = NEW.stock_id;

        IF v_shares_held < NEW.quantity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Insufficient shares for this sale';
        END IF;

    END IF;

END$$


-- =============================================================================
-- TRIGGER 2: after_transaction_insert
-- Purpose : Apply the trade's side-effects AFTER the row is committed.
--
--   BUY:
--     a) Deduct total_amount from users.virtual_balance
--     b) Upsert portfolios row; recalculate weighted avg_purchase_price
--
--   SELL:
--     a) Credit total_amount to users.virtual_balance
--     b) Reduce quantity_held in portfolios
--     c) Delete the portfolio row when quantity_held reaches zero
-- =============================================================================

DROP TRIGGER IF EXISTS after_transaction_insert$$

CREATE TRIGGER after_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN

    -- ==================================================================
    -- BUY side-effects
    -- ==================================================================
    IF NEW.type = 'BUY' THEN

        -- (a) Deduct cash
        UPDATE users
           SET virtual_balance = virtual_balance - NEW.total_amount
         WHERE id = NEW.user_id;

        -- (b) Upsert portfolio row
        --     If no row exists → insert with the trade price as avg.
        --     If a row exists  → recalculate weighted average:
        --         new_avg = (old_qty * old_avg + new_qty * new_price)
        --                   / (old_qty + new_qty)
        INSERT INTO portfolios (user_id, stock_id, quantity_held, avg_purchase_price)
        VALUES (
            NEW.user_id,
            NEW.stock_id,
            NEW.quantity,
            NEW.price_at_transaction
        )
        ON DUPLICATE KEY UPDATE
            avg_purchase_price = ROUND(
                (quantity_held * avg_purchase_price + NEW.quantity * NEW.price_at_transaction)
                / (quantity_held + NEW.quantity),
                2
            ),
            quantity_held = quantity_held + NEW.quantity;

    END IF;

    -- ==================================================================
    -- SELL side-effects
    -- ==================================================================
    IF NEW.type = 'SELL' THEN

        -- (a) Credit cash
        UPDATE users
           SET virtual_balance = virtual_balance + NEW.total_amount
         WHERE id = NEW.user_id;

        -- (b) Reduce quantity
        UPDATE portfolios
           SET quantity_held = quantity_held - NEW.quantity
         WHERE user_id  = NEW.user_id
           AND stock_id = NEW.stock_id;

        -- (c) Clean up fully liquidated positions
        DELETE FROM portfolios
         WHERE user_id     = NEW.user_id
           AND stock_id    = NEW.stock_id
           AND quantity_held <= 0;

    END IF;

END$$

DELIMITER ;
