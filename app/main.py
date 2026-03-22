"""Главное приложение FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base
from app.models import models
from app.routes import auth, admin, educator, driver, processor, inspector, public


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 MedWaste API starting...")
    yield
    print("🛑 MedWaste API shutting down...")


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="API для управления медицинскими отходами",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(educator.router)
app.include_router(driver.router)
app.include_router(processor.router)
app.include_router(inspector.router)


# Эндпоинты


@app.get("/", tags=["Root"])
async def root():
    """Корневой эндпойнт API."""
    return {
        "message": "MedWaste API",
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Проверка здоровья сервиса."""
    return {"status": "ok"}


if __name__ == "__main__":

#ПРИ НАЖАТИИ КНОПКИ "НОВАЯ ПАРТИЯ" ПРИ РОЛИ EDUCATOR_1 ПИШЕТСЯ, ЧТО ЭТА ФУНКЦИЯ ПОКА В РАЗРАБОТКЕ + ПРИ 
#ЗАПОЛНЕНИИ ФОРМЫ "НОВОЙ ПАРТИИ" ДОЛЖНЫ БЫТЬ ПРУТСТВОВАТЬ ПАРАМЕТРЫ (ТОЧКИ ВЫЗОВА И ПЕРЕРАБОТЧИКА)

#НЕ РАБОТАЕТ КНОПКА ГЕНЕРАЦИИ QR КОДА СО СТОРОНЫ EDUCATOR

#ОТСУТСТВУЕТ НАЗВАНИЕ ОРГАНИЗАЦИИ В ПРОФИЛЕ

#ОТСУТСТВУЕТ ВОЗМОЖНОСТЬ СКАНИРОВАНИЯ QR КОДА ДЛЯ РОЛИ DRIVER_1

#ПОЧЕМУ В DASHBORD В РОЛИ DRIVER ДОСТУПНЫ 120 ПАРТИЙ ОТХОДОВ - НАВЕРНОЕ, ЧТО-ТО ИДЕТ НЕ ТАК И ОН ВИДИТ
# ВСЕ ПАРТИИ

#Одинаковый DASHBOARD ДЛЯ ВСНЕХ РОЛЕЙ

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )

