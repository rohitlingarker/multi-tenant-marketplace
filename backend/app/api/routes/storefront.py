from fastapi import APIRouter, Depends

from app.api.deps import tenant_context
from app.core.context import RequestContext
from app.models.schemas import StorefrontProduct
from app.services import listing_service

router = APIRouter(prefix="/storefront", tags=["storefront"])


@router.get("/products", response_model=list[StorefrontProduct])
def list_products(ctx: RequestContext = Depends(tenant_context)) -> list[StorefrontProduct]:
    return [StorefrontProduct(**p) for p in listing_service.list_storefront(ctx)]
