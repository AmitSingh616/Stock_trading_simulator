-- =============================================================================
-- Seed Data: seed_data.sql
-- 10 stocks across all three volatility tiers.
-- Run AFTER db_init.sql and triggers.sql.
-- =============================================================================

USE virtual_trading;

INSERT INTO stocks (symbol, company_name, current_price, volatility_tier) VALUES
-- STABLE (± 0.5% per cycle)
('AAPL',  'Apple Inc.',                    182.50, 'STABLE'),
('MSFT',  'Microsoft Corporation',         415.00, 'STABLE'),
('JPM',   'JPMorgan Chase & Co.',          198.30, 'STABLE'),

-- NORMAL (± 2% per cycle)
('GOOGL', 'Alphabet Inc.',                 175.30, 'NORMAL'),
('AMZN',  'Amazon.com Inc.',               195.80, 'NORMAL'),
('META',  'Meta Platforms Inc.',           505.10, 'NORMAL'),
('NFLX',  'Netflix Inc.',                  630.75, 'NORMAL'),

-- VOLATILE (± 5% per cycle)
('TSLA',  'Tesla Inc.',                    245.20, 'VOLATILE'),
('NVDA',  'NVIDIA Corporation',            875.40, 'VOLATILE'),
('AMD',   'Advanced Micro Devices Inc.',   168.90, 'VOLATILE')

ON DUPLICATE KEY UPDATE
    company_name    = VALUES(company_name),
    current_price   = VALUES(current_price),
    volatility_tier = VALUES(volatility_tier);
