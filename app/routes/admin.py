"""Эндпоинты администратора."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from app.core.database import get_db
from app.schemas.schemas import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    UserCreate,
    UserResponse,
    UserUpdate,
    WasteTypeCreate,
    WasteTypeResponse,
    WasteTypeUpdate,
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


@router.patch("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org: OrganizationUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить организацию."""
    if org.inn is not None:
        existing = await OrganizationService.get_by_inn(db, org.inn)
        if existing and existing.id != org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Организация с таким ИНН уже существует",
            )
    updated = await OrganizationService.update(db, org_id, org)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Организация не найдена"
        )
    return updated


@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить организацию."""
    try:
        ok = await OrganizationService.delete(db, org_id)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить организацию: есть связанные записи",
        )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Организация не найдена"
        )
    return None


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


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    organization_id: UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Получить список пользователей (опционально по организации)."""
    return await UserService.get_all(
        db, skip=skip, limit=limit, organization_id=organization_id
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user: UserUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить пользователя (роль, организация, профиль, пароль)."""
    if user.username is not None:
        existing = await UserService.get_by_username(db, user.username)
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="username уже занят",
            )
    if user.email is not None:
        existing = await UserService.get_by_email(db, str(user.email))
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="email уже занят",
            )
    if user.organization_id is not None and not await OrganizationService.get_by_id(
        db, user.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация не найдена",
        )
    updated = await UserService.update(db, user_id, user)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
        )
    return updated


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить пользователя."""
    try:
        ok = await UserService.delete(db, user_id)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить пользователя: есть связанные записи",
        )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
        )
    return None


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


@router.patch("/waste-types/{waste_type_id}", response_model=WasteTypeResponse)
async def update_waste_type(
    waste_type_id: UUID,
    waste_type: WasteTypeUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить тип отходов."""
    if waste_type.code is not None:
        existing = await WasteTypeService.get_by_code(db, waste_type.code)
        if existing and existing.id != waste_type_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Тип отходов с таким кодом уже существует",
            )
    updated = await WasteTypeService.update(db, waste_type_id, waste_type)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Тип отходов не найден"
        )
    return updated


@router.delete("/waste-types/{waste_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_waste_type(
    waste_type_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить тип отходов."""
    try:
        ok = await WasteTypeService.delete(db, waste_type_id)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить тип отходов: он используется в партиях",
        )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Тип отходов не найден"
        )
    return None
