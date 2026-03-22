#!/usr/bin/env python3
import asyncio
import sys
sys.path.insert(0, '/app')

from sqlalchemy import select
from app.core.database import async_session
from app.models.models import WasteType

async def check_waste_types():
    async with async_session() as session:
        result = await session.execute(select(WasteType))
        types = result.scalars().all()
        for wt in types:
            print(f"  - {wt.name}")

asyncio.run(check_waste_types())
