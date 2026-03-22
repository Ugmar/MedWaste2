"""Открытые эндпоинты для залогиненных пользователей."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.schemas import OrganizationResponse, WasteTypeResponse, EventResponse
from app.services.crud import OrganizationService, WasteTypeService
from app.models.models import Event
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


@router.get("/waste-types", response_model=List[WasteTypeResponse])
async def list_waste_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить список типов отходов (доступно всем залогиненным)."""
    return await WasteTypeService.get_all(db, skip, limit)


@router.get("/events/recent", response_model=List[EventResponse])
async def get_recent_events(
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить последние события в системе."""
    result = await db.execute(
        select(Event)
        .order_by(desc(Event.created_at))
        .limit(limit)
    )
    return result.scalars().all()
