"""Ядро приложения: конфигурация, БД, безопасность, зависимости."""

from app.core.config import settings
from app.core.database import Base, async_session, get_db

__all__ = ["settings", "Base", "async_session", "get_db"]
