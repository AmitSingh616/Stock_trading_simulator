from flask import Blueprint, jsonify, request

from models.stock_model import get_all_stocks, get_stock_by_symbol, get_stock_history
from utils.auth_utils import login_required

stock_bp = Blueprint("stocks", __name__)


@stock_bp.route("", methods=["GET"])
@login_required
def list_stocks():
    stocks = get_all_stocks()
    return jsonify(stocks), 200


@stock_bp.route("/<string:symbol>", methods=["GET"])
@login_required
def get_stock(symbol: str):
    stock = get_stock_by_symbol(symbol.upper())
    if not stock:
        return jsonify({"error": f"Stock '{symbol.upper()}' not found"}), 404
    return jsonify(stock), 200


@stock_bp.route("/<string:symbol>/history", methods=["GET"])
@login_required
def get_history(symbol: str):
    stock = get_stock_by_symbol(symbol.upper())
    if not stock:
        return jsonify({"error": f"Stock '{symbol.upper()}' not found"}), 404

    # Optional ?limit= query param; default 100, max 500
    try:
        limit = min(int(request.args.get("limit", 100)), 500)
    except ValueError:
        limit = 100

    history = get_stock_history(stock["id"], limit)
    return jsonify({"symbol": symbol.upper(), "history": history}), 200
