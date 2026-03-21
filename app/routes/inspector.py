"""Эндпоинты инспектора."""

import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.schemas.schemas import WasteBatchResponse
from app.core.dependencies import get_current_inspector
from app.models.models import User, WasteBatch, Event
from app.enums import WasteStatus
from typing import List
from datetime import datetime

router = APIRouter(prefix="/inspector", tags=["Инспектор"])


@router.get("/waste-batches", response_model=List[WasteBatchResponse])
async def list_all_waste_batches(
    status_filter: WasteStatus = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_inspector: User = Depends(get_current_inspector),
    db: AsyncSession = Depends(get_db),
):
    """Получить все партии отходов (статистика)."""
    query = select(WasteBatch)
    if status_filter:
        query = query.where(WasteBatch.status == status_filter)
    result = await db.execute(query.offset(skip).limit(limit))
    batches = result.scalars().all()
    return batches


@router.get("/summary")
async def get_summary(
    current_inspector: User = Depends(get_current_inspector),
    db: AsyncSession = Depends(get_db),
):
    """Получить сводную статистику."""
    total_batches_result = await db.execute(select(func.count(WasteBatch.id)))
    total_batches = total_batches_result.scalar() or 0
    
    created_result = await db.execute(
        select(func.count(WasteBatch.id)).where(
            WasteBatch.status == WasteStatus.CREATED
        )
    )
    created_count = created_result.scalar() or 0
    
    in_transit_result = await db.execute(
        select(func.count(WasteBatch.id)).where(
            WasteBatch.status == WasteStatus.IN_TRANSIT
        )
    )
    in_transit_count = in_transit_result.scalar() or 0
    
    received_result = await db.execute(
        select(func.count(WasteBatch.id)).where(
            WasteBatch.status == WasteStatus.RECEIVED
        )
    )
    received_count = received_result.scalar() or 0
    
    total_events_result = await db.execute(select(func.count(Event.id)))
    total_events = total_events_result.scalar() or 0
    
    return {
        "total_batches": total_batches,
        "batches_created": created_count,
        "batches_in_transit": in_transit_count,
        "batches_received": received_count,
        "total_events": total_events,
    }


@router.get("/reports/batches/csv")
async def export_batches_csv(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_inspector: User = Depends(get_current_inspector),
    db: AsyncSession = Depends(get_db),
):
    """Экспортировать CSV-отчет по всем партиям за период."""
    query = select(WasteBatch).options(selectinload(WasteBatch.waste_type))
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
        "educator_id",
        "organization_id",
        "processor_organization_id",
        "driver_id",
        "waste_type",
        "quantity",
        "unit",
        "status",
        "pickup_address",
        "delivery_address",
        "created_at",
        "updated_at",
    ])
    for batch in batches:
        writer.writerow([
            str(batch.id),
            str(batch.educator_id),
            str(batch.organization_id),
            str(batch.processor_organization_id),
            str(batch.driver_id) if batch.driver_id else "",
            batch.waste_type.name if batch.waste_type else "",
            str(batch.quantity),
            batch.unit,
            batch.status.value,
            batch.pickup_address,
            batch.delivery_address,
            batch.created_at.isoformat() if batch.created_at else "",
            batch.updated_at.isoformat() if batch.updated_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inspector_batches_report.csv"},
    )


@router.get("/reports/events/csv")
async def export_events_csv(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_inspector: User = Depends(get_current_inspector),
    db: AsyncSession = Depends(get_db),
):
    """Экспортировать CSV-отчет по событиям за период."""
    query = select(Event)
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
        headers={"Content-Disposition": "attachment; filename=inspector_events_report.csv"},
    )
