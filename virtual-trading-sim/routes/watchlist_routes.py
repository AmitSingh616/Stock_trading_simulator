from flask import Blueprint, jsonify, request, session

from models.stock_model import get_stock_by_symbol
from models.watchlist_model import add_to_watchlist, get_watchlist, remove_from_watchlist
from utils.auth_utils import login_required

watchlist_bp = Blueprint("watchlist", __name__)


def _resolve_symbol(data: dict | None) -> tuple[dict | None, str | None]:
    """Extract symbol from body and resolve to a stock row."""
    if not data:
        return None, "Request body is required"
    symbol = str(data.get("symbol", "")).upper().strip()
    if not symbol:
        return None, "symbol is required"
    stock = get_stock_by_symbol(symbol)
    if not stock:
        return None, f"Stock '{symbol}' not found"
    return stock, None


@watchlist_bp.route("/add", methods=["POST"])
@login_required
def add():
    stock, error = _resolve_symbol(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400 if "required" in error else 404

    add_to_watchlist(session["user_id"], stock["id"])
    return jsonify({"message": f"{stock['symbol']} added to watchlist"}), 200


@watchlist_bp.route("/remove", methods=["DELETE"])
@login_required
def remove():
    stock, error = _resolve_symbol(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400 if "required" in error else 404

    removed = remove_from_watchlist(session["user_id"], stock["id"])
    if not removed:
        return jsonify({"error": f"{stock['symbol']} is not in your watchlist"}), 404
    return jsonify({"message": f"{stock['symbol']} removed from watchlist"}), 200


@watchlist_bp.route("", methods=["GET"])
@login_required
def list_watchlist():
    items = get_watchlist(session["user_id"])
    return jsonify(items), 200
