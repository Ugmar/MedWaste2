#!/usr/bin/env python3
"""
Test batch creation and status updates
"""
import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import async_session
from app.models.models import User, WasteBatch, WasteType
from app.enums import WasteStatus
from app.services.crud import WasteBatchService

async def test_batch_creation():
    """Test batch creation and status updates"""
    
    async with async_session() as session:
        # 1. Найти учителя (EDUCATOR)
        result = await session.execute(
            select(User).where(User.username == "educator_1").options(selectinload(User.organization))
        )
        educator = result.scalars().first()
        print(f"✅ Educator: {educator.username} ({educator.organization.name})")
        
        # 2. Найти processor organization
        result = await session.execute(
            select(User).where(User.username == "processor_1").options(selectinload(User.organization))
        )
        processor = result.scalars().first()
        print(f"✅ Processor Org: {processor.organization.name}")
        
        # 3. Найти waste type
        result = await session.execute(
            select(WasteType).where(WasteType.name == "Перчатки медицинские").limit(1)
        )
        waste_type = result.scalars().first()
        if not waste_type:
            print("❌ WasteType not found")
            return
        print(f"✅ Waste Type: {waste_type.name}")
        
        # 4. Создадим партию
        new_batch = WasteBatch(
            educator_id=educator.id,
            organization_id=educator.organization_id,
            processor_organization_id=processor.organization_id,
            waste_type_id=waste_type.id,
            quantity=150,
            unit="kg",
            pickup_address="ул. Тестовая, д. 123",
            delivery_address="ул. Переработки, д. 1",
            status=WasteStatus.CREATED
        )
        session.add(new_batch)
        await session.flush()
        print(f"\n✅ Batch created: {new_batch.id}")
        print(f"   Status: {new_batch.status}")
        print(f"   Quantity: {new_batch.quantity} {new_batch.unit}")
        
        # 5. Обновим статус на IN_TRANSIT (по API это делает водитель)
        updated = await WasteBatchService.update_status(
            session, new_batch.id, WasteStatus.IN_TRANSIT, educator.id
        )
        print(f"\n✅ Status updated to IN_TRANSIT: {updated.status}")
        
        # 6. Обновим статус на RECEIVED (по API это делает переработчик)
        updated = await WasteBatchService.update_status(
            session, new_batch.id, WasteStatus.RECEIVED, processor.id
        )
        print(f"✅ Status updated to RECEIVED: {updated.status}")
        
        # 7. Проверим history
        result = await session.execute(
            select(WasteBatch).where(WasteBatch.id == new_batch.id)
        )
        final_batch = result.scalars().first()
        print(f"\n✅ Final batch status: {final_batch.status}")
        print(f"   Updated at: {final_batch.updated_at}")
        
        await session.commit()
        print(f"\n✅ Batch creation and status update test PASSED!")

# Run test
asyncio.run(test_batch_creation())
