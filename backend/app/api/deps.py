from fastapi import Depends, Request

from app.core.context import RequestContext
from app.middleware import rbac
from app.models.enums import Role


def get_context(request: Request) -> RequestContext:
    return RequestContext(
        tenant=getattr(request.state, "tenant", None),
        user=getattr(request.state, "user", None),
    )


def require_roles(*roles: Role):
    def dependency(ctx: RequestContext = Depends(get_context)) -> RequestContext:
        rbac.authorize(ctx, *roles)
        return ctx

    return dependency


vendor_context = require_roles(Role.VENDOR)
admin_context = require_roles(Role.ADMIN)
