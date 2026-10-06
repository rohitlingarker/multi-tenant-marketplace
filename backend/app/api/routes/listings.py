from fastapi import APIRouter, Depends, status

from app.api.deps import admin_context, require_roles, vendor_context
from app.core.context import RequestContext
from app.models.enums import Role
from app.models.schemas import ListingResponse, RejectListingRequest, SubmitListingRequest
from app.services import listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=list[ListingResponse])
def list_listings(
    ctx: RequestContext = Depends(require_roles(Role.VENDOR, Role.ADMIN)),
) -> list[ListingResponse]:
    return [ListingResponse(**listing) for listing in listing_service.list_listings(ctx)]


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def submit_listing(
    body: SubmitListingRequest, ctx: RequestContext = Depends(vendor_context)
) -> ListingResponse:
    return ListingResponse(**listing_service.submit_listing(ctx, body.sku, body.priceCents))


@router.post("/{listing_id}/approve", response_model=ListingResponse)
def approve_listing(
    listing_id: str, ctx: RequestContext = Depends(admin_context)
) -> ListingResponse:
    return ListingResponse(**listing_service.approve_listing(ctx, listing_id))


@router.post("/{listing_id}/reject", response_model=ListingResponse)
def reject_listing(
    listing_id: str, body: RejectListingRequest, ctx: RequestContext = Depends(admin_context)
) -> ListingResponse:
    return ListingResponse(**listing_service.reject_listing(ctx, listing_id, body.reason))


@router.post("/{listing_id}/delist", response_model=ListingResponse)
def delist_listing(
    listing_id: str, ctx: RequestContext = Depends(admin_context)
) -> ListingResponse:
    return ListingResponse(**listing_service.delist_listing(ctx, listing_id))
