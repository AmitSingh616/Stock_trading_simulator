from extensions import get_connection


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username, email, virtual_balance, created_at "
            "FROM users WHERE id = %s",
            (user_id,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def get_user_by_username(username: str) -> dict | None:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def create_user(username: str, email: str, password_hash: str) -> int:
    """Insert a new user and return the new user ID."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, password_hash),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        conn.close()
