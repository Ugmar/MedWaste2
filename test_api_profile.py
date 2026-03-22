import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import async_session
from app.models.models import User, Organization

async def test():
    async with async_session() as session:
        # Получим пользователя через get_current_user логику
        result = await session.execute(
            select(User).where(User.username == "educator_1").options(selectinload(User.organization))
        )
        current_user = result.scalars().first()
        
        if current_user:
            print(f"✅ Пользователь: {current_user.username}")
            print(f"   ID: {current_user.id}")
            print(f"   Email: {current_user.email}")
            print(f"   Full Name: {current_user.full_name}")
            print(f"   Role: {current_user.role}")
            print(f"   organization_id: {current_user.organization_id}")
            print(f"   organization: {current_user.organization}")
            if current_user.organization:
                print(f"   org_name: {current_user.organization.name}")
            
            # Также проверим что ответ можно сериализовать в JSON как UserResponse
            from app.schemas.schemas import UserResponse
            from pydantic import RootModel
            
            # Пытаемся создать UserResponse
            response = UserResponse.model_validate(current_user, from_attributes=True)
            print(f"\n✅ UserResponse создана:")
            print(f"   id: {response.id}")
            print(f"   username: {response.username}")
            print(f"   email: {response.email}")
            print(f"   organization: {response.organization}")
            if response.organization:
                print(f"   org_name: {response.organization.name}")
                
asyncio.run(test())
