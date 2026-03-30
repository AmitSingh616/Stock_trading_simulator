from flask import Blueprint, jsonify, request, session

from models.stock_model import get_stock_by_symbol
from services.portfolio_service import (
    get_portfolio,
    get_portfolio_history,
    get_transactions,
)
from utils.auth_utils import login_required

# Registered at url_prefix='/api' in app.py so that:
#   GET /api/portfolio
#   GET /api/transactions        ← matches spec exactly
#   GET /api/portfolio/history
portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.route("/portfolio", methods=["GET"])
@login_required
def portfolio():
    result = get_portfolio(session["user_id"])
    return jsonify(result), 200


@portfolio_bp.route("/transactions", methods=["GET"])
@login_required
def transactions():
    user_id = session["user_id"]

    # --- optional filters ---
    symbol = request.args.get("symbol", "").upper().strip() or None
    trans_type = request.args.get("type", "").upper().strip() or None

    try:
        limit = min(int(request.args.get("limit", 50)), 500)
    except ValueError:
        limit = 50

    # Validate type filter
    if trans_type and trans_type not in ("BUY", "SELL"):
        return jsonify({"error": "type must be BUY or SELL"}), 400

    # Resolve symbol → stock_id (backend never uses symbol internally)
    stock_id = None
    if symbol:
        stock = get_stock_by_symbol(symbol)
        if not stock:
            return jsonify({"error": f"Stock '{symbol}' not found"}), 404
        stock_id = stock["id"]

    result = get_transactions(user_id, stock_id, trans_type, limit)
    return jsonify(result), 200


@portfolio_bp.route("/portfolio/history", methods=["GET"])
@login_required
def portfolio_history():
    result = get_portfolio_history(session["user_id"])
    return jsonify(result), 200
