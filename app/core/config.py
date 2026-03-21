"""Конфигурация приложения."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Глобальные параметры приложения."""
    
    # Database
    database_url: str = "postgresql+asyncpg://medwaste_user:medwaste_password@localhost:5432/medwaste_db"
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # QR Code
    qr_token_lifetime_days: int = 7
    
    # Server
    debug: bool = False
    app_title: str = "MedWaste API"
    app_version: str = "1.0.0"
    
    # CORS
    allowed_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost",
    ]
    
    class Config:
        env_file = ".env"


settings = Settings()
