import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.core.database import async_session
from app.models.models import User, Organization

async def test():
    async with async_session() as session:
        # Запросим пользователей с organization используя selectinload
        result = await session.execute(
            select(User).where(User.username == "educator_1").options(selectinload(User.organization))
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✅ Пользователь найден: {user.username}")
            print(f"   ID: {user.id}")
            print(f"   organization_id: {user.organization_id}")
            print(f"   organization (attribute): {user.organization}")
            if user.organization:
                print(f"   org_name: {user.organization.name}")
            else:
                print("   ❌ organization объект = None!")
        else:
            print("❌ Пользователь не найден!")
        
        # Дополнительно - проверим БД напрямую
        raw_result = await session.execute(text("SELECT id, username, organization_id FROM users LIMIT 5"))
        print(f"\n📋 Пользователи из БД:")
        for row in raw_result.fetchall():
            print(f"   {row}")

asyncio.run(test())
