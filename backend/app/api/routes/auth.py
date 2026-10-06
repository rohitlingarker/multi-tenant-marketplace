from fastapi import APIRouter

from app.models.schemas import LoginRequest, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest) -> UserResponse:
    return UserResponse(**auth_service.login(body.username, body.password))
