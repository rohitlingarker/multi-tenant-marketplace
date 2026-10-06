from pydantic import BaseModel, Field

from app.models.enums import Role


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
