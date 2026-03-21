"""Конфигурация подключения к БД и AsyncSession."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=0,
)

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    """Dependency для получения асинхронной сессии БД."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
