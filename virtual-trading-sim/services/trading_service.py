import mysql.connector

from models.stock_model import get_stock_by_symbol
from models.transaction_model import insert_transaction


def execute_buy(
    user_id: int, symbol: str, quantity: int
) -> tuple[dict | None, str | None, int]:
    """
    Execute a manual market BUY at current price.

    Returns: (result_dict, error_message, http_status_code)
    All validation (balance check) is handled by the BEFORE INSERT trigger.
    """
    stock = get_stock_by_symbol(symbol)
    if not stock:
        return None, f"Stock '{symbol}' not found", 404

    stock_id = stock["id"]
    current_price = float(stock["current_price"])
    total_amount = round(current_price * quantity, 2)

    try:
        transaction_id = insert_transaction(
            user_id, stock_id, "BUY", quantity, current_price, total_amount
        )
    except mysql.connector.Error as exc:
        # Trigger SIGNAL fires here for insufficient balance
        return None, exc.msg, 400

    return (
        {
            "message": "Buy order executed successfully",
            "transaction_id": transaction_id,
            "symbol": symbol,
            "company_name": stock["company_name"],
            "quantity": quantity,
            "price": current_price,
            "total_amount": total_amount,
        },
        None,
        200,
    )


def execute_sell(
    user_id: int, symbol: str, quantity: int
) -> tuple[dict | None, str | None, int]:
    """
    Execute a manual market SELL at current price.

    Returns: (result_dict, error_message, http_status_code)
    All validation (shares check) is handled by the BEFORE INSERT trigger.
    """
    stock = get_stock_by_symbol(symbol)
    if not stock:
        return None, f"Stock '{symbol}' not found", 404

    stock_id = stock["id"]
    current_price = float(stock["current_price"])
    total_amount = round(current_price * quantity, 2)

    try:
        transaction_id = insert_transaction(
            user_id, stock_id, "SELL", quantity, current_price, total_amount
        )
    except mysql.connector.Error as exc:
        # Trigger SIGNAL fires here for insufficient shares
        return None, exc.msg, 400

    return (
        {
            "message": "Sell order executed successfully",
            "transaction_id": transaction_id,
            "symbol": symbol,
            "company_name": stock["company_name"],
            "quantity": quantity,
            "price": current_price,
            "total_amount": total_amount,
        },
        None,
        200,
    )
