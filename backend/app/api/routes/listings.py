from fastapi import APIRouter, Depends, status

from app.api.deps import vendor_context
from app.core.context import RequestContext
from app.models.schemas import ListingResponse, SubmitListingRequest
from app.services import listing_service

router = APIRouter(prefix="/listings", tags=["listings"])


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def submit_listing(
    body: SubmitListingRequest, ctx: RequestContext = Depends(vendor_context)
) -> ListingResponse:
    return ListingResponse(**listing_service.submit_listing(ctx, body.sku, body.priceCents))
