from models.portfolio_model import get_user_portfolio
from models.transaction_model import get_user_transactions
from models.snapshot_model import get_user_snapshots
from models.user_model import get_user_by_id
from utils.constants import STARTING_BALANCE


# ---------------------------------------------------------------------------
# Portfolio
# ---------------------------------------------------------------------------

def get_portfolio(user_id: int) -> dict:
    user = get_user_by_id(user_id)
    holdings = get_user_portfolio(user_id)

    total_stock_value = sum(float(h["current_value"]) for h in holdings)
    cost_basis_total = sum(float(h["cost_basis"]) for h in holdings)
    cash = float(user["virtual_balance"])

    return {
        "cash_balance": round(cash, 2),
        "total_stock_value": round(total_stock_value, 2),
        "total_portfolio_value": round(cash + total_stock_value, 2),
        "total_cost_basis": round(cost_basis_total, 2),
        "holdings": holdings,
    }


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

def get_transactions(
    user_id: int,
    stock_id: int | None,
    trans_type: str | None,
    limit: int,
) -> list[dict]:
    return get_user_transactions(user_id, stock_id, trans_type, limit)


# ---------------------------------------------------------------------------
# History (snapshots)
# ---------------------------------------------------------------------------

def get_portfolio_history(user_id: int) -> list[dict]:
    return get_user_snapshots(user_id)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def get_net_worth(user_id: int) -> dict:
    user = get_user_by_id(user_id)
    holdings = get_user_portfolio(user_id)

    stock_value = sum(float(h["current_value"]) for h in holdings)
    cash = float(user["virtual_balance"])

    return {
        "cash": round(cash, 2),
        "stocks": round(stock_value, 2),
        "net_worth": round(cash + stock_value, 2),
    }


def get_performance(user_id: int) -> dict:
    user = get_user_by_id(user_id)
    holdings = get_user_portfolio(user_id)

    stock_value = sum(float(h["current_value"]) for h in holdings)
    cash = float(user["virtual_balance"])
    net_worth = cash + stock_value

    pnl = net_worth - STARTING_BALANCE
    pnl_percent = (pnl / STARTING_BALANCE) * 100

    return {
        "starting_balance": STARTING_BALANCE,
        "current_net_worth": round(net_worth, 2),
        "pnl": round(pnl, 2),
        "pnl_percent": round(pnl_percent, 2),
        "holdings_breakdown": holdings,
    }
