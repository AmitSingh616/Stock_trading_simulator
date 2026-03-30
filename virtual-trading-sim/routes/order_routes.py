from flask import Blueprint, jsonify, request, session

from services.order_service import cancel_order, create_order, get_orders
from utils.auth_utils import login_required

order_bp = Blueprint("orders", __name__)


@order_bp.route("/create", methods=["POST"])
@login_required
def create():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    result, error, status = create_order(session["user_id"], data)
    if error:
        return jsonify({"error": error}), status
    return jsonify(result), status


@order_bp.route("", methods=["GET"])
@login_required
def list_orders():
    orders = get_orders(session["user_id"])
    return jsonify(orders), 200


@order_bp.route("/<int:order_id>", methods=["DELETE"])
@login_required
def delete_order(order_id: int):
    result, error, status = cancel_order(order_id, session["user_id"])
    if error:
        return jsonify({"error": error}), status
    return jsonify(result), status
