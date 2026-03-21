"""Эндпоинты образователя."""

import csv
from io import StringIO
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.core.database import get_db
from app.schemas.schemas import (
    WasteBatchCreate,
    WasteBatchResponse,
    WasteBatchDetailResponse,
    QRTokenCreate,
    QRTokenResponse,
    UserResponse,
)
from app.services.crud import (
    WasteBatchService,
    QRTokenService,
    WasteTypeService,
    UserService,
    OrganizationService,
    EventService,
)
from app.enums import UserRole, EventType
from app.core.dependencies import get_current_educator
from app.models.models import User, WasteBatch, Event
from typing import List

router = APIRouter(prefix="/educator", tags=["Образователь"])


@router.post("/batches", response_model=WasteBatchResponse)
async def create_batch(
    batch: WasteBatchCreate,
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    waste_type = await WasteTypeService.get_by_id(db, batch.waste_type_id)
    if not waste_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Тип отходов не найден"
        )

    processor_org = await OrganizationService.get_by_id(db, batch.processor_organization_id)
    if not processor_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация-переработчик не найдена",
        )

    driver = await UserService.get_by_id(db, batch.driver_id)
    if not driver or driver.role != UserRole.DRIVER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Выбранный водитель не найден",
        )
    if driver.organization_id != batch.processor_organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Водитель должен принадлежать выбранной организации-переработчику",
        )

    created_batch = await WasteBatchService.create(
        db,
        batch,
        educator_id=current_educator.id,
        organization_id=current_educator.organization_id,
    )
    await EventService.log_event(
        db=db,
        event_type=EventType.BATCH_CREATED,
        user_id=current_educator.id,
        object_type="WasteBatch",
        object_id=created_batch.id,
        description=f"Создана партия {created_batch.id}",
    )
    return created_batch


@router.get("/drivers", response_model=List[UserResponse])
async def list_available_drivers(
    processor_organization_id: UUID = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Получить список водителей для назначения на партию."""
    processor_org = await OrganizationService.get_by_id(db, processor_organization_id)
    if not processor_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация-переработчик не найдена",
        )
    return await UserService.get_drivers_by_organization(
        db,
        processor_organization_id,
        skip,
        limit,
    )


@router.get("/batches", response_model=List[WasteBatchResponse])
async def list_my_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Получить мои партии отходов."""
    return await WasteBatchService.get_all_by_educator(
        db, current_educator.id, skip, limit
    )


@router.get("/batches/{batch_id}", response_model=WasteBatchDetailResponse)
async def get_batch_details(
    batch_id: UUID,
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Получить детали партии отходов."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.educator_id != current_educator.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    return batch


@router.post("/batches/{batch_id}/qr-tokens", response_model=QRTokenResponse)
async def generate_qr_token(
    batch_id: UUID,
    qr_request: QRTokenCreate,
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Сгенерировать QR токен для партии."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.educator_id != current_educator.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    try:
        qr_token = await QRTokenService.create(db, batch_id, qr_request.lifetime_days)
        await EventService.log_event(
            db=db,
            event_type=EventType.QR_GENERATED,
            user_id=current_educator.id,
            object_type="QRToken",
            object_id=qr_token.id,
            description=f"Сгенерирован QR токен для партии {batch.id}",
        )
        return qr_token
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get("/batches/{batch_id}/qr-tokens", response_model=List[QRTokenResponse])
async def list_batch_qr_tokens(
    batch_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Получить список QR токенов партии."""
    batch = await WasteBatchService.get_by_id(db, batch_id)
    if not batch or batch.educator_id != current_educator.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Партия не найдена"
        )
    return await QRTokenService.get_all_by_batch(db, batch_id, skip, limit)


@router.get("/reports/batches/csv")
async def export_batches_csv(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Экспортировать CSV-отчет по партиям образователя за период."""
    query = (
        select(WasteBatch)
        .options(selectinload(WasteBatch.waste_type))
        .where(WasteBatch.educator_id == current_educator.id)
    )
    if date_from:
        query = query.where(WasteBatch.created_at >= date_from)
    if date_to:
        query = query.where(WasteBatch.created_at <= date_to)

    result = await db.execute(query.order_by(WasteBatch.created_at.desc()))
    batches = result.scalars().all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "batch_id",
        "waste_type",
        "quantity",
        "unit",
        "status",
        "pickup_address",
        "delivery_address",
        "driver_id",
        "processor_organization_id",
        "created_at",
        "updated_at",
    ])
    for batch in batches:
        writer.writerow([
            str(batch.id),
            batch.waste_type.name if batch.waste_type else "",
            str(batch.quantity),
            batch.unit,
            batch.status.value,
            batch.pickup_address,
            batch.delivery_address,
            str(batch.driver_id) if batch.driver_id else "",
            str(batch.processor_organization_id),
            batch.created_at.isoformat() if batch.created_at else "",
            batch.updated_at.isoformat() if batch.updated_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=educator_batches_report.csv"},
    )


@router.get("/reports/events/csv")
async def export_events_csv(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_educator: User = Depends(get_current_educator),
    db: AsyncSession = Depends(get_db),
):
    """Экспортировать CSV-отчет по событиям образователя за период."""
    batch_ids_result = await db.execute(
        select(WasteBatch.id).where(WasteBatch.educator_id == current_educator.id)
    )
    batch_ids = batch_ids_result.scalars().all()

    if not batch_ids:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["event_id", "event_type", "user_id", "object_type", "object_id", "description", "created_at"])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=educator_events_report.csv"},
        )

    query = select(Event).where(
        Event.object_type == "WasteBatch",
        Event.object_id.in_(batch_ids),
    )
    if date_from:
        query = query.where(Event.created_at >= date_from)
    if date_to:
        query = query.where(Event.created_at <= date_to)

    result = await db.execute(query.order_by(Event.created_at.desc()))
    events = result.scalars().all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["event_id", "event_type", "user_id", "object_type", "object_id", "description", "created_at"])
    for event in events:
        writer.writerow([
            str(event.id),
            event.event_type.value,
            str(event.user_id) if event.user_id else "",
            event.object_type,
            str(event.object_id),
            event.description or "",
            event.created_at.isoformat() if event.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=educator_events_report.csv"},
    )
