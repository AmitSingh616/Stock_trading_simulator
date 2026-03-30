import re

EMAIL_RE = re.compile(r"[^@]+@[^@]+\.[^@]+")


def validate_register(data: dict | None) -> str | None:
    """Return an error string or None if valid."""
    if not data:
        return "Request body is required"
    if not data.get("username") or not str(data["username"]).strip():
        return "username is required"
    if len(str(data["username"]).strip()) < 3:
        return "username must be at least 3 characters"
    if not data.get("email"):
        return "email is required"
    if not EMAIL_RE.match(str(data["email"])):
        return "Invalid email format"
    if not data.get("password"):
        return "password is required"
    if len(str(data["password"])) < 6:
        return "password must be at least 6 characters"
    return None


def validate_login(data: dict | None) -> str | None:
    if not data:
        return "Request body is required"
    if not data.get("email"):
        return "email is required"
    if not data.get("password"):
        return "password is required"
    return None
