"""Coarse role checks. Ownership checks that need the listing itself live in services."""
from app.core.context import RequestContext
from app.core.errors import Forbidden, TenantNotResolved, Unauthenticated
from app.models.enums import Role


def require_tenant(ctx: RequestContext) -> None:
    """For public, tenant-scoped routes (e.g. the storefront): no user needed."""
    if ctx.tenant is None:
        raise TenantNotResolved()


def authorize(ctx: RequestContext, *allowed_roles: Role) -> None:
    require_tenant(ctx)
    if ctx.user is None:
        raise Unauthenticated()
    if ctx.role not in {r.value for r in allowed_roles}:
        raise Forbidden()
    if ctx.role == Role.ADMIN.value and ctx.user.get("tenantId") != ctx.tenant_id:
        raise Forbidden()
