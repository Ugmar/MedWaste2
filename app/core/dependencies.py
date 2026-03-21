"""Зависимости для эндпоинтов API."""

from functools import lru_cache
from typing import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.services.crud import UserService
from app.models.models import User
from app.enums import UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Получить текущего пользователя из токена."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None or (user_id := payload.get("sub")) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
    
    try:
        user_uuid = UUID(str(user_id))
        user = await UserService.get_by_id(db, user_uuid)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный формат токена",
        )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    return user


def _check_role_factory(*allowed_roles: UserRole) -> Callable:
    """Factory функция для создания роль-зависимостей (DRY принцип)."""
    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Доступ запрещен для вашей роли",
            )
        return current_user
    return check_role


get_current_educator = _check_role_factory(UserRole.EDUCATOR)
get_current_driver = _check_role_factory(UserRole.DRIVER)
get_current_processor = _check_role_factory(UserRole.PROCESSOR)
get_current_inspector = _check_role_factory(UserRole.INSPECTOR)
get_current_admin = _check_role_factory(UserRole.ADMIN)
