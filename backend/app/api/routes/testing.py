"""QA-only test infrastructure. Not part of the public API contract.

Reloads the in-memory store from seed-data.json, same as restarting the
app, so Playwright can get a clean slate between test cases without
actually restarting the server.
"""
from fastapi import APIRouter, status

from app.repositories import json_store

router = APIRouter(prefix="/__test__", tags=["testing"])


@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_store() -> None:
    json_store.load()
