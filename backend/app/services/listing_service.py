from datetime import datetime, timezone

from app.core.context import RequestContext
from app.core.errors import (
    Forbidden,
    InvalidStatusTransition,
    ListingNotFound,
    ProductNotFound,
)
from app.models.enums import ListingStatus, Role
from app.repositories import listings_repo, products_repo, vendors_repo
from app.services.compliance import validate_listing


# The only legal status changes. REJECTED and DELISTED are terminal.
ALLOWED_TRANSITIONS: dict[ListingStatus, set[ListingStatus]] = {
    ListingStatus.SUBMITTED: {ListingStatus.APPROVED, ListingStatus.REJECTED},
    ListingStatus.APPROVED: {ListingStatus.DELISTED},
    ListingStatus.REJECTED: set(),
    ListingStatus.DELISTED: set(),
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _with_product(listing: dict, product: dict) -> dict:
    return {**listing, "productName": product["name"], "category": product["category"]}


def _transition(
    ctx: RequestContext, listing_id: str, target: ListingStatus, reason: str | None = None
) -> dict:
    """Move a listing to `target`, appending to its audit trail. Shared by approve/reject/delist."""
    listing = listings_repo.get_by_id(ctx.tenant_id, listing_id)
    if listing is None:
        raise ListingNotFound(listing_id)

    current = ListingStatus(listing["status"])
    if target not in ALLOWED_TRANSITIONS[current]:
        raise InvalidStatusTransition(current.value, target.value)

    entry = {"status": target.value, "byUserId": ctx.user_id, "at": _now_iso()}
    if reason is not None:
        entry["reason"] = reason

    updated = listings_repo.update(
        ctx.tenant_id,
        listing_id,
        {"status": target.value, "audit": [*listing["audit"], entry]},
    )
    return _with_product(updated, products_repo.get_by_sku(updated["sku"]))


def approve_listing(ctx: RequestContext, listing_id: str) -> dict:
    return _transition(ctx, listing_id, ListingStatus.APPROVED)


def list_listings(ctx: RequestContext) -> list[dict]:
    """Vendors see only their own listings in this tenant; admins see the tenant's whole queue."""
    vendor_id = ctx.vendor_id if ctx.role == Role.VENDOR.value else None
    if ctx.role == Role.VENDOR.value and vendor_id is None:
        raise Forbidden("Your account is not linked to a vendor.")

    listings = listings_repo.list_by_tenant(ctx.tenant_id, vendor_id=vendor_id)
    return [_with_product(listing, products_repo.get_by_sku(listing["sku"])) for listing in listings]


def submit_listing(ctx: RequestContext, sku: str, price_cents: int | float) -> dict:
    product = products_repo.get_by_sku(sku)
    if product is None:
        raise ProductNotFound(sku)

    vendor = vendors_repo.get_by_id(ctx.vendor_id)
    if vendor is None:
        raise Forbidden("Your account is not linked to a vendor.")

    error = validate_listing(ctx.tenant, vendor, product, price_cents)
    if error:
        raise error

    listing = listings_repo.create(
        ctx.tenant_id,
        {
            "vendorId": vendor["id"],
            "sku": product["sku"],
            "priceCents": price_cents,
            "status": ListingStatus.SUBMITTED.value,
            "rejectionReason": None,
            "audit": [
                {
                    "status": ListingStatus.SUBMITTED.value,
                    "byUserId": ctx.user_id,
                    "at": _now_iso(),
                }
            ],
        },
    )
    return _with_product(listing, product)
