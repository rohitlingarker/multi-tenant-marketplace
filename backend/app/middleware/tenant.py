"""Resolve the tenant from X-Tenant-Id, falling back to the Host header's domain.

Only attaches request.state.tenant (None if unresolved). Whether a route needs
a tenant is decided by RBAC, so public routes like /auth/login still work.
"""
from fastapi import Request

from app.repositories import tenants_repo


async def resolve_tenant(request: Request, call_next):
    tenant_id = request.headers.get("x-tenant-id")
    if tenant_id:
        tenant = tenants_repo.get_by_id(tenant_id)
    else:
        host = request.headers.get("host", "").split(":")[0]
        tenant = tenants_repo.get_by_domain(host) if host else None

    request.state.tenant = tenant
    return await call_next(request)
