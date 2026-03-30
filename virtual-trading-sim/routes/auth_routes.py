from flask import Blueprint, jsonify, request, session

from models.user_model import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)
from utils.auth_utils import hash_password, login_required, verify_password
from utils.validation import validate_login, validate_register

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    error = validate_register(data)
    if error:
        return jsonify({"error": error}), 400

    if get_user_by_email(data["email"]):
        return jsonify({"error": "Email is already registered"}), 409
    if get_user_by_username(data["username"]):
        return jsonify({"error": "Username is already taken"}), 409

    user_id = create_user(
        data["username"].strip(),
        data["email"].strip().lower(),
        hash_password(data["password"]),
    )

    session["user_id"] = user_id
    session.permanent = True
    return jsonify({"message": "Registered successfully", "user_id": user_id}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    error = validate_login(data)
    if error:
        return jsonify({"error": error}), 400

    user = get_user_by_email(data["email"].strip().lower())
    if not user or not verify_password(data["password"], user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    session.permanent = True
    return jsonify({"message": "Logged in successfully", "user_id": user["id"]}), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    user = get_user_by_id(session["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200
