from flask import Blueprint, jsonify, request, session

from services.trading_service import execute_buy, execute_sell
from utils.auth_utils import login_required

trading_bp = Blueprint("trading", __name__)


def _parse_trade_request(data: dict | None) -> tuple[str, int, str | None]:
    """
    Extract and validate symbol + quantity from request body.
    Returns (symbol, quantity, error_message).
    """
    if not data:
        return "", 0, "Request body is required"

    symbol = str(data.get("symbol", "")).upper().strip()
    if not symbol:
        return "", 0, "symbol is required"

    raw_qty = data.get("quantity")
    try:
        quantity = int(raw_qty)
        if quantity <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return symbol, 0, "quantity must be a positive integer"

    return symbol, quantity, None


@trading_bp.route("/buy", methods=["POST"])
@login_required
def buy():
    data = request.get_json(silent=True)
    symbol, quantity, err = _parse_trade_request(data)
    if err:
        return jsonify({"error": err}), 400

    result, error, status = execute_buy(session["user_id"], symbol, quantity)
    if error:
        return jsonify({"error": error}), status
    return jsonify(result), status


@trading_bp.route("/sell", methods=["POST"])
@login_required
def sell():
    data = request.get_json(silent=True)
    symbol, quantity, err = _parse_trade_request(data)
    if err:
        return jsonify({"error": err}), 400

    result, error, status = execute_sell(session["user_id"], symbol, quantity)
    if error:
        return jsonify({"error": error}), status
    return jsonify(result), status
