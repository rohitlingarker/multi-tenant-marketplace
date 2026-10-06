"""Resolve the current user from X-User-Id. Attaches request.state.user (None if absent/unknown)."""
from fastapi import Request

from app.repositories import users_repo


async def resolve_user(request: Request, call_next):
    user_id = request.headers.get("x-user-id")
    user = users_repo.get_by_id(user_id) if user_id else None
    if user:
        user.pop("passwordHash", None)

    request.state.user = user
    return await call_next(request)
