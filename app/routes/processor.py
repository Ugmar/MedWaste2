"""Эндпоинты переработчика."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import (
    WasteBatchResponse,
    WasteBatchDetailResponse,
    UserCreate,
    UserResponse,
    QRTokenScanRequest,
    QRTokenScanResponse,
)
from app.services.crud import WasteBatchService, UserService, EventService, QRTokenService
from app.core.dependencies import get_current_processor
from app.core.security import is_token_expired
from app.models.models import User
from app.enums import UserRole, WasteStatus, EventType
from typing import List

router = APIRouter(prefix="/processor", tags=["Переработчик"])


@router.post("/scan-qr", response_model=QRTokenScanResponse)
async def scan_qr_code(
    request: QRTokenScanRequest,
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Отсканировать QR код партии переработчиком."""
    qr_token = await QRTokenService.scan_token(db, request.token)
    if not qr_token:
        token_record = await QRTokenService.get_by_token(db, request.token)
        if token_record:
            if not token_record.is_valid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Токен больше не действителен",
                )
            if is_token_expired(token_record.expires_at):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Срок действия токена истек",
                )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Токен не найден"
        )

    batch = await WasteBatchService.get_by_id(db, qr_token.batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Партия не найдена",
        )

    if batch.processor_organization_id != current_processor.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Эта партия не назначена вашей организации",
        )

    if batch.status != WasteStatus.IN_TRANSIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сканирование доступно только при доставке: партия должна быть в статусе 'in_transit'",
        )

    await EventService.log_event(
        db=db,
        event_type=EventType.QR_SCANNED,
        user_id=current_processor.id,
        object_type="QRToken",
        object_id=qr_token.id,
        description=f"QR токен для партии {batch.id} отсканирован переработчиком",
    )

    return QRTokenScanResponse(
        message="Данные партии успешно получены",
        batch_id=batch.id,
        status=batch.status,
        waste_type_name=batch.waste_type.name,
        quantity=batch.quantity,
        unit=batch.unit,
        pickup_address=batch.pickup_address,
        delivery_address=batch.delivery_address,
        educator_name=batch.educator.full_name,
        educator_organization_name=batch.organization.name,
        processor_organization_name=batch.processor_organization.name,
        access_expires_at=qr_token.expires_at,
    )


@router.get("/assigned-batches", response_model=List[WasteBatchDetailResponse])
async def list_assigned_batches(
    status_filter: WasteStatus = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Получить партии, назначенные переработчику."""
    batches = await WasteBatchService.get_all_by_processor_organization(
        db, current_processor.organization_id, skip, limit
    )
    if status_filter:
        batches = [batch for batch in batches if batch.status == status_filter]
    return batches


@router.get("/batches/{batch_id}", response_model=WasteBatchDetailResponse)
async def get_batch_details(
    batch_id: UUID,
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Получить детали партии."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.processor_organization_id != current_processor.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    return batch


@router.post("/batches/{batch_id}/receive", response_model=dict)
async def receive_batch(
    batch_id: UUID,
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Принять партию на переработку."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.processor_organization_id != current_processor.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    try:
        updated_batch = await WasteBatchService.update_status(
            db, batch_id, WasteStatus.RECEIVED, current_processor.id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await EventService.log_event(
        db=db,
        event_type=EventType.BATCH_STATUS_CHANGED,
        user_id=current_processor.id,
        object_type="WasteBatch",
        object_id=updated_batch.id,
        description=f"Статус партии изменен на {updated_batch.status.value}",
    )
    return {
        "message": "Партия принята переработчиком",
        "batch_id": batch_id,
        "new_status": updated_batch.status.value,
        "received_at": updated_batch.updated_at.isoformat(),
    }


@router.post("/batches/{batch_id}/complete", response_model=dict)
async def complete_batch(
    batch_id: UUID,
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Отметить партию как обработанную."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.processor_organization_id != current_processor.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    if batch.status != WasteStatus.RECEIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Только принятые партии могут быть помечены как обработанные",
        )
    try:
        updated_batch = await WasteBatchService.update_status(
            db, batch_id, WasteStatus.PROCESSED, current_processor.id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await EventService.log_event(
        db=db,
        event_type=EventType.BATCH_STATUS_CHANGED,
        user_id=current_processor.id,
        object_type="WasteBatch",
        object_id=updated_batch.id,
        description=f"Партия обработана. Статус изменен на {updated_batch.status.value}",
    )
    return {
        "message": "Партия успешно отмечена как обработанная",
        "batch_id": batch_id,
        "new_status": updated_batch.status.value,
        "processed_at": updated_batch.updated_at.isoformat(),
    }


@router.post("/drivers", response_model=UserResponse)
async def create_driver(
    driver: UserCreate,
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Создать водителя в организации."""
    if driver.role != UserRole.DRIVER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Роль должна быть водитель",
        )
    driver.organization_id = current_processor.organization_id
    if (
        await UserService.get_by_username(db, driver.username)
        or await UserService.get_by_email(db, driver.email)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь уже существует",
        )
    return await UserService.create(db, driver)


@router.get("/drivers", response_model=List[UserResponse])
async def list_organization_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_processor: User = Depends(get_current_processor),
    db: AsyncSession = Depends(get_db),
):
    """Получить водителей организации."""
    users = await UserService.get_all_by_organization(
        db, current_processor.organization_id, skip, limit
    )
    drivers = [user for user in users if user.role == UserRole.DRIVER]
    return drivers
