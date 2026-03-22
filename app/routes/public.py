"""Открытые эндпоинты для залогиненных пользователей."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.schemas import OrganizationResponse
from app.services.crud import OrganizationService
from typing import List

router = APIRouter(tags=["Public"])


@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить список организаций (доступно всем залогиненным)."""
    return await OrganizationService.get_all(db, skip, limit)
