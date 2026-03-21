"""Эндпоинты аутентификации."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse
from app.services.crud import UserService
from app.core.security import verify_password, create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Аутентификация"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход пользователя и получение токена доступа."""
    user = await UserService.get_by_username(db, request.username)
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
        )
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=timedelta(minutes=30)
    )
    return TokenResponse(access_token=access_token)
