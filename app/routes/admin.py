"""Эндпоинты администратора."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import (
    OrganizationCreate,
    OrganizationResponse,
    UserCreate,
    UserResponse,
    WasteTypeCreate,
    WasteTypeResponse,
)
from app.services.crud import (
    OrganizationService,
    UserService,
    WasteTypeService,
)
from app.core.dependencies import get_current_admin
from app.models.models import User
from typing import List

router = APIRouter(prefix="/admin", tags=["Администратор"])


@router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(
    org: OrganizationCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Создать организацию."""
    existing = await OrganizationService.get_by_inn(db, org.inn)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация с таким ИНН уже существует",
        )
    return await OrganizationService.create(db, org)


@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Получить список организаций."""
    return await OrganizationService.get_all(db, skip, limit)


@router.post("/users", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Создать пользователя."""
    if (
        await UserService.get_by_username(db, user.username)
        or await UserService.get_by_email(db, user.email)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь уже существует",
        )
    if not await OrganizationService.get_by_id(db, user.organization_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация не найдена",
        )
    return await UserService.create(db, user)


@router.get("/waste-types", response_model=List[WasteTypeResponse])
async def list_waste_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Получить список типов отходов."""
    return await WasteTypeService.get_all(db, skip, limit)


@router.post("/waste-types", response_model=WasteTypeResponse)
async def create_waste_type(
    waste_type: WasteTypeCreate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Создать тип отходов."""
    existing = await WasteTypeService.get_by_code(db, waste_type.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Тип отходов с таким кодом уже существует",
        )
    return await WasteTypeService.create(db, waste_type)
