from flask import Blueprint, jsonify, session

from services.portfolio_service import get_net_worth, get_performance
from utils.auth_utils import login_required

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/networth", methods=["GET"])
@login_required
def networth():
    result = get_net_worth(session["user_id"])
    return jsonify(result), 200


@analytics_bp.route("/performance", methods=["GET"])
@login_required
def performance():
    result = get_performance(session["user_id"])
    return jsonify(result), 200
