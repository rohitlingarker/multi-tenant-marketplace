"""Listing data access. Every function takes tenant_id first so tenant isolation is structural."""
from app.repositories import json_store


def _next_id() -> str:
    return f"lst_{len(json_store.collection('listings')) + 1:03d}"


def create(tenant_id: str, listing: dict) -> dict:
    record = {**listing, "id": _next_id(), "tenantId": tenant_id}
    json_store.collection("listings").append(record)
    json_store.save()
    return json_store.snapshot(record)


def _find(tenant_id: str, listing_id: str) -> dict | None:
    for listing in json_store.collection("listings"):
        if listing["tenantId"] == tenant_id and listing["id"] == listing_id:
            return listing
    return None


def get_by_id(tenant_id: str, listing_id: str) -> dict | None:
    listing = _find(tenant_id, listing_id)
    return json_store.snapshot(listing) if listing else None


def update(tenant_id: str, listing_id: str, changes: dict) -> dict | None:
    listing = _find(tenant_id, listing_id)
    if listing is None:
        return None
    listing.update(changes)
    json_store.save()
    return json_store.snapshot(listing)


def list_by_tenant(
    tenant_id: str, vendor_id: str | None = None, status: str | None = None
) -> list[dict]:
    return [
        json_store.snapshot(listing)
        for listing in json_store.collection("listings")
        if listing["tenantId"] == tenant_id
        and (vendor_id is None or listing["vendorId"] == vendor_id)
        and (status is None or listing["status"] == status)
    ]
