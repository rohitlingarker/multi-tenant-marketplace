"""Single access point to the JSON store.

The seed file is loaded into memory at import time and never modified, so
restarting the app resets the demo. Writes persist to store.json.
"""
import copy
import json
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent / "db"
SEED_PATH = DB_DIR / "seed-data.json"
STORE_PATH = DB_DIR / "store.json"

_data: dict = {}


def load() -> None:
    global _data
    with SEED_PATH.open(encoding="utf-8") as f:
        _data = json.load(f)
    save()


def save() -> None:
    with STORE_PATH.open("w", encoding="utf-8") as f:
        json.dump(_data, f, indent=2)


def collection(name: str) -> list[dict]:
    if not _data:
        load()
    return _data.setdefault(name, [])


def snapshot(record: dict) -> dict:
    """Copy a record so callers can't mutate the store by accident."""
    return copy.deepcopy(record)
