from datetime import datetime, timezone

from app.core.context import RequestContext
from app.core.errors import Forbidden, ProductNotFound
from app.models.enums import ListingStatus
from app.repositories import listings_repo, products_repo, vendors_repo
from app.services.compliance import validate_listing


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _with_product(listing: dict, product: dict) -> dict:
    return {**listing, "productName": product["name"], "category": product["category"]}


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
