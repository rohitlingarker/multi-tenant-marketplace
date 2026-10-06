from app.repositories import json_store


def get_by_username(username: str) -> dict | None:
    for user in json_store.collection("users"):
        if user.get("username") == username:
            return json_store.snapshot(user)
    return None


def get_by_id(user_id: str) -> dict | None:
    for user in json_store.collection("users"):
        if user.get("id") == user_id:
            return json_store.snapshot(user)
    return None
