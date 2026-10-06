"""Listing data access. Every function takes tenant_id first so tenant isolation is structural."""
from app.repositories import json_store


def _next_id() -> str:
    return f"lst_{len(json_store.collection('listings')) + 1:03d}"


def create(tenant_id: str, listing: dict) -> dict:
    record = {**listing, "id": _next_id(), "tenantId": tenant_id}
    json_store.collection("listings").append(record)
    json_store.save()
    return json_store.snapshot(record)


def list_by_tenant(tenant_id: str) -> list[dict]:
    return [
        json_store.snapshot(listing)
        for listing in json_store.collection("listings")
        if listing["tenantId"] == tenant_id
    ]
