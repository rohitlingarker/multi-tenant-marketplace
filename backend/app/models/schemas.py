from pydantic import BaseModel, Field, StrictFloat, StrictInt

from app.models.enums import Category, ListingStatus, Role


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    """A user record minus passwordHash. Field names match the seed data's camelCase."""

    id: str
    username: str
    role: Role
    vendorId: str | None = None
    tenantId: str | None = None


class SubmitListingRequest(BaseModel):
    sku: str = Field(min_length=1)
    # Floats are accepted here so that a non-integer price reaches the service
    # and fails as PRICE_INVALID rather than as a generic validation error.
    priceCents: StrictInt | StrictFloat


class AuditEntry(BaseModel):
    status: ListingStatus
    byUserId: str
    at: str
    reason: str | None = None


class ListingResponse(BaseModel):
    id: str
    tenantId: str
    vendorId: str
    sku: str
    productName: str
    category: Category
    priceCents: int
    status: ListingStatus
    rejectionReason: str | None = None
    audit: list[AuditEntry]
