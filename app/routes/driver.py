"""Эндпоинты водителя."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.schemas.schemas import QRTokenScanRequest, QRTokenScanResponse, WasteBatchDetailResponse
from app.services.crud import QRTokenService, WasteBatchService, EventService
from app.core.security import is_token_expired
from app.core.dependencies import get_current_driver
from app.enums import WasteStatus, EventType
from app.models.models import User, WasteBatch
from typing import List

router = APIRouter(prefix="/driver", tags=["Водитель"])


@router.post("/scan-qr", response_model=QRTokenScanResponse)
async def scan_qr_code(
    request: QRTokenScanRequest,
    current_driver: User = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    """Отсканировать QR код партии."""
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
    if batch.driver_id != current_driver.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Этот водитель не назначен на партию",
        )
    await EventService.log_event(
        db=db,
        event_type=EventType.QR_SCANNED,
        user_id=current_driver.id,
        object_type="QRToken",
        object_id=qr_token.id,
        description=f"QR токен для партии {batch.id} отсканирован",
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


@router.post("/batch/{batch_id}/pickup", response_model=dict)
async def confirm_pickup(
    batch_id: UUID,
    token: str,
    current_driver: User = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    """Подтвердить получение партии."""
    qr_token = await QRTokenService.get_by_token(db, token)
    if not qr_token or qr_token.batch_id != batch_id or not qr_token.is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Недействительный токен"
        )
    if is_token_expired(qr_token.expires_at):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Срок действия токена истек",
        )
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    if batch.driver_id != current_driver.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Этот водитель не назначен на партию",
        )
    try:
        updated_batch = await WasteBatchService.update_status(
            db, batch_id, WasteStatus.IN_TRANSIT, current_driver.id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    await EventService.log_event(
        db=db,
        event_type=EventType.BATCH_STATUS_CHANGED,
        user_id=current_driver.id,
        object_type="WasteBatch",
        object_id=updated_batch.id,
        description=f"Статус партии изменен на {updated_batch.status.value}",
    )
    return {
        "message": "Партия передана водителю",
        "batch_id": batch_id,
        "new_status": updated_batch.status.value,
    }


@router.get("/batches", response_model=List[WasteBatchDetailResponse])
async def list_assigned_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_driver: User = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    """Получить список партий, назначенных водителю."""
    result = await db.execute(
        select(WasteBatch)
        .where(WasteBatch.driver_id == current_driver.id)
        .options(
            selectinload(WasteBatch.waste_type),
            selectinload(WasteBatch.educator),
            selectinload(WasteBatch.organization),
            selectinload(WasteBatch.processor_organization),
        )
        .offset(skip)
        .limit(limit)
    )
    batches = result.scalars().all()
    return batches
