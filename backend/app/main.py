from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import auth, listings, storefront, testing
from app.core.errors import DomainError, http_status_for
from app.middleware.auth import resolve_user
from app.middleware.tenant import resolve_tenant
from app.repositories import json_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    json_store.load()
    yield


app = FastAPI(title="Multi-tenant Marketplace", lifespan=lifespan)

# Starlette runs the last-added middleware first: tenant -> auth -> (RBAC per route).
app.add_middleware(BaseHTTPMiddleware, dispatch=resolve_user)
app.add_middleware(BaseHTTPMiddleware, dispatch=resolve_tenant)


@app.exception_handler(DomainError)
def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=http_status_for(exc.code),
        content={"error": {"code": exc.code, "message": exc.message}},
    )


app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(storefront.router)
app.include_router(testing.router)
