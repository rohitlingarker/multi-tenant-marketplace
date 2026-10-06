"""Coarse role checks. Ownership checks that need the listing itself live in services."""
from app.core.context import RequestContext
from app.core.errors import Forbidden, TenantNotResolved, Unauthenticated
from app.models.enums import Role


def authorize(ctx: RequestContext, *allowed_roles: Role) -> None:
    if ctx.tenant is None:
        raise TenantNotResolved()
    if ctx.user is None:
        raise Unauthenticated()
    if ctx.role not in {r.value for r in allowed_roles}:
        raise Forbidden()
    if ctx.role == Role.ADMIN.value and ctx.user.get("tenantId") != ctx.tenant_id:
        raise Forbidden()
