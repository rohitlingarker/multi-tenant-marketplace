from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import auth
from app.core.errors import DomainError, http_status_for
from app.repositories import json_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    json_store.load()
    yield


app = FastAPI(title="Multi-tenant Marketplace", lifespan=lifespan)


@app.exception_handler(DomainError)
def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=http_status_for(exc.code),
        content={"error": {"code": exc.code, "message": exc.message}},
    )


app.include_router(auth.router)
