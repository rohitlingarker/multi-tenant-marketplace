from app.repositories import json_store


def get_by_id(vendor_id: str) -> dict | None:
    for vendor in json_store.collection("vendors"):
        if vendor["id"] == vendor_id:
            return json_store.snapshot(vendor)
    return None
