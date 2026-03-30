# Volatility tier → max price swing per cycle (as a decimal fraction)
VOLATILITY_RANGES = {
    "STABLE":   0.005,   # ±0.5%
    "NORMAL":   0.02,    # ±2%
    "VOLATILE": 0.05,    # ±5%
}

# Valid pending order types
VALID_ORDER_TYPES = {"LIMIT_BUY", "STOP_LOSS", "TAKE_PROFIT"}

# Starting virtual balance (must match DB default)
STARTING_BALANCE = 100_000.00

# Minimum stock price floor
MIN_STOCK_PRICE = 0.01
