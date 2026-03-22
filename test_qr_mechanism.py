#!/usr/bin/env python3
"""
End-to-end test for QR code scanning mechanism
"""
import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import async_session
from app.models.models import User, WasteBatch, QRToken
from app.core.security import generate_qr_token
from app.services.crud import QRTokenService
from datetime import datetime, timedelta

async def test_qr_mechanism():
    """Test QR code generation and scanning"""
    
    async with async_session() as session:
        # 1. Найти учителя (EDUCATOR) с партией
        result = await session.execute(
            select(User).where(User.username == "educator_1").options(selectinload(User.organization))
        )
        educator = result.scalars().first()
        print(f"✅ Educator found: {educator.username} ({educator.organization.name})")
        
        # 2. Найти партию учителя
        result = await session.execute(
            select(WasteBatch)
            .where(WasteBatch.educator_id == educator.id)
            .options(selectinload(WasteBatch.processor_organization))
            .limit(1)
        )
        batch = result.scalars().first()
        if not batch:
            print("❌ No batches found for educator")
            return
        
        print(f"✅ Batch found: {batch.id} (Status: {batch.status})")
        print(f"   From: {batch.pickup_address}")
        print(f"   To: {batch.delivery_address}")
        print(f"   Processor Org: {batch.processor_organization.name if batch.processor_organization else 'None'}")
        
        # 4. Генерируем QR токен
        token_value = generate_qr_token()
        print(f"\n✅ Generated QR token: {token_value}")
        
        # 4. Сохраняем QR токен в БД
        expires_at = datetime.utcnow() + timedelta(days=7)
        qr_token = QRToken(
            batch_id=batch.id,
            token=token_value,
            expires_at=expires_at,
            is_valid=True
        )
        session.add(qr_token)
        await session.flush()  # Flush to get token.id
        
        print(f"✅ QR token saved to database")
        print(f"   Token ID: {qr_token.id}")
        print(f"   Expires: {qr_token.expires_at}")
        
        # 5. Проверим что можно получить QR токен по значению
        saved_token = await QRTokenService.get_by_token(session, token_value)
        if not saved_token:
            print("❌ Could not retrieve saved token!")
            return
        
        print(f"✅ QR token retrieved from DB")
        print(f"   Batch ID: {saved_token.batch_id}")
        print(f"   Valid: {saved_token.is_valid}")
        
        # 6. Теперь попробуем отсканировать как PROCESSOR
        result = await session.execute(
            select(User).where(User.username == "processor_1").options(selectinload(User.organization))
        )
        processor = result.scalars().first()
        if not processor:
            print("❌ Processor not found!")
            return
        
        print(f"\n✅ Processor found: {processor.username} ({processor.organization.name})")
        
        # 7. Проверяем что PROCESSOR организация совпадает с processor_organization в партии
        if batch.processor_organization_id != processor.organization_id:
            print(f"❌ Processor org mismatch!")
            print(f"   Batch requires: {batch.processor_organization_id}")
            print(f"   Processor has: {processor.organization_id}")
            return
        
        print(f"✅ Processor organization matches batch requirements")
        
        await session.commit()
        print(f"\n✅ QR scanning mechanism test PASSED!")

# Run test
asyncio.run(test_qr_mechanism())
