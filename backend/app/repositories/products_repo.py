from app.repositories import json_store


def get_by_sku(sku: str) -> dict | None:
    for product in json_store.collection("products"):
        if product["sku"] == sku:
            return json_store.snapshot(product)
    return None
